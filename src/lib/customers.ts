import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  total_due?: number | null;
  due?: number | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  total_due?: number | null;
}

export interface GetCustomersOptions {
  search?: string;
  page?: number;
  limit?: number;
  skip?: number;
}

export interface CustomerStats {
  total: number;
  totalDue: number;
  dueCustomersCount: number;
}

export interface PaginatedCustomersResult {
  customers: Customer[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  stats: CustomerStats;
}

let indexesEnsured = false;

/**
 * Ensure MongoDB indexes on customers collection are partial unique
 * so multiple customers with null email/phone can coexist without collision.
 */
export async function ensureCustomerSparseIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    try {
      await prisma.$runCommandRaw({ dropIndexes: "customers", index: "customers_email_key" });
    } catch {
      // ignore if does not exist
    }
    try {
      await prisma.$runCommandRaw({ dropIndexes: "customers", index: "customers_phone_key" });
    } catch {
      // ignore if does not exist
    }

    await prisma.$runCommandRaw({
      createIndexes: "customers",
      indexes: [
        {
          key: { phone: 1 },
          name: "customers_phone_key",
          unique: true,
          partialFilterExpression: { phone: { $type: "string" } },
        },
      ],
    });

    indexesEnsured = true;
  } catch (error) {
    console.warn("Could not configure partial indexes on customers collection:", error);
  }
}

/**
 * Recalculate customer's total due based on all their transactions
 * and update the customer record in the database.
 */
export async function calculateAndUpdateCustomerDue(
  customerId: string,
  txClient?: Prisma.TransactionClient
): Promise<number> {
  const db = txClient || prisma;

  const transactions = await db.transaction.findMany({
    where: { customer_id: customerId },
    select: {
      amount: true,
      paid_amount: true,
      due_amount: true,
    },
  });

  let totalDebit = 0;
  let totalCredit = 0;

  for (const tx of transactions) {
    const amount = Number(tx.amount) || 0;
    const dueAmount = Number(tx.due_amount) || 0;
    const paidAmount = Number(tx.paid_amount) || 0;

    // If amount is positive, that's debit. If amount is 0 and due_amount > 0 and paid is 0, that's initial due.
    totalDebit += amount > 0 ? amount : dueAmount > 0 && paidAmount === 0 ? dueAmount : 0;
    totalCredit += paidAmount;
  }

  const calculatedDue = Math.max(0, parseFloat((totalDebit - totalCredit).toFixed(2)));

  await db.customer.update({
    where: { id: customerId },
    data: { total_due: calculatedDue },
  });

  return calculatedDue;
}

/**
 * Fetch overall customer statistics (total customer count, total due sum, and due customer count)
 */
export async function getCustomerStats(): Promise<CustomerStats> {
  try {
    const [total, dueCount, dueAgg] = await Promise.all([
      prisma.customer.count(),
      prisma.customer.count({
        where: { total_due: { gt: 0 } },
      }),
      prisma.customer.aggregate({
        _sum: {
          total_due: true,
        },
      }),
    ]);

    return {
      total,
      dueCustomersCount: dueCount,
      totalDue: parseFloat((dueAgg._sum.total_due || 0).toFixed(2)),
    };
  } catch (error) {
    console.error("Error fetching customer stats:", error);
    return {
      total: 0,
      totalDue: 0,
      dueCustomersCount: 0,
    };
  }
}

/**
 * Fetch paginated customers with server-side search and pagination
 */
export async function getPaginatedCustomers(
  options: GetCustomersOptions = {}
): Promise<PaginatedCustomersResult> {
  try {
    await ensureCustomerSparseIndexes();

    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const skip = options.skip !== undefined ? options.skip : (page - 1) * limit;

    const whereClause: {
      AND?: Array<{
        OR?: Array<{
          name?: { contains: string; mode: "insensitive" };
          phone?: { contains: string; mode: "insensitive" };
          address?: { contains: string; mode: "insensitive" };
        }>;
      }>;
    } = {};

    const conditions = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { phone: { contains: term, mode: "insensitive" as const } },
          { address: { contains: term, mode: "insensitive" as const } },
        ],
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    const [customers, total, stats] = await Promise.all([
      prisma.customer.findMany({
        where: whereClause,
        orderBy: { created_at: "desc" },
        take: limit,
        skip,
      }),
      prisma.customer.count({ where: whereClause }),
      getCustomerStats(),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      customers: customers.map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone,
        address: c.address,
        total_due: c.total_due ?? 0,
        due: c.total_due ?? 0,
        created_at: c.created_at,
        updated_at: c.updated_at,
      })),
      total,
      totalPages,
      currentPage: page,
      limit,
      stats,
    };
  } catch (error) {
    console.error("Error fetching paginated customers:", error);
    return {
      customers: [],
      total: 0,
      totalPages: 1,
      currentPage: options.page || 1,
      limit: options.limit || 20,
      stats: { total: 0, totalDue: 0, dueCustomersCount: 0 },
    };
  }
}

/**
 * Fetch customers with optional search and type filtering
 */
export async function getCustomers(options: GetCustomersOptions = {}): Promise<Customer[]> {
  try {
    await ensureCustomerSparseIndexes();

    const whereClause: {
      AND?: Array<{
        OR?: Array<{
          name?: { contains: string; mode: "insensitive" };
          phone?: { contains: string; mode: "insensitive" };
          address?: { contains: string; mode: "insensitive" };
        }>;
      }>;
    } = {};

    const conditions = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { phone: { contains: term, mode: "insensitive" as const } },
          { address: { contains: term, mode: "insensitive" as const } },
        ],
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    const customers = await prisma.customer.findMany({
      where: whereClause,
      orderBy: { created_at: "desc" },
      take: options.limit,
      skip: options.skip,
    });

    return customers.map((c) => ({
      id: c.id,
      name: c.name,
      phone: c.phone,
      address: c.address,
      total_due: c.total_due ?? 0,
      due: c.total_due ?? 0,
      created_at: c.created_at,
      updated_at: c.updated_at,
    }));
  } catch (error) {
    console.error("Error fetching customers from database:", error);
    return [];
  }
}

/**
 * Fetch a single customer by ID
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) return null;

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      address: customer.address,
      total_due: customer.total_due ?? 0,
      due: customer.total_due ?? 0,
      created_at: customer.created_at,
      updated_at: customer.updated_at,
    };
  } catch (error) {
    console.error("Error fetching customer by ID:", error);
    return null;
  }
}

/**
 * Create a new customer in the database
 */
export async function createCustomer(input: CustomerInput): Promise<Customer> {
  await ensureCustomerSparseIndexes();

  const { name, phone, address, total_due } = input;

  if (!name?.trim()) {
    throw new Error("গ্রাহকের নাম আবশ্যক");
  }

  const cleanPhone = phone?.trim() ? phone.trim() : null;
  const cleanAddress = address?.trim() ? address.trim() : null;

  // Check unique phone if provided
  if (cleanPhone) {
    const existingWithPhone = await prisma.customer.findFirst({
      where: { phone: cleanPhone },
    });
    if (existingWithPhone) {
      throw new Error(
        `এই ফোন নম্বর (${cleanPhone}) ইতিমধ্যে অন্য একজন গ্রাহকের জন্য ব্যবহৃত হয়েছে`
      );
    }
  }

  const newCustomer = await prisma.customer.create({
    data: {
      name: name.trim(),
      phone: cleanPhone,
      address: cleanAddress,
      total_due: total_due !== undefined && total_due !== null ? Number(total_due) : 0,
    },
  });

  return {
    id: newCustomer.id,
    name: newCustomer.name,
    phone: newCustomer.phone,
    address: newCustomer.address,
    total_due: newCustomer.total_due ?? 0,
    due: newCustomer.total_due ?? 0,
    created_at: newCustomer.created_at,
    updated_at: newCustomer.updated_at,
  };
}

/**
 * Update an existing customer
 */
export async function updateCustomer(id: string, input: Partial<CustomerInput>): Promise<Customer> {
  await ensureCustomerSparseIndexes();

  if (!id) {
    throw new Error("গ্রাহক আইডি আবশ্যক");
  }

  const existing = await prisma.customer.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("গ্রাহক খুঁজে পাওয়া যায়নি");
  }

  const data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    total_due?: number | null;
  } = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("গ্রাহকের নাম খালি রাখা যাবে না");
    data.name = input.name.trim();
  }

  if (input.phone !== undefined) {
    const cleanPhone = input.phone?.trim() ? input.phone.trim() : null;
    if (cleanPhone && cleanPhone !== existing.phone) {
      const duplicate = await prisma.customer.findFirst({
        where: { phone: cleanPhone, NOT: { id } },
      });
      if (duplicate) {
        throw new Error(`এই ফোন নম্বর (${cleanPhone}) ইতিমধ্যে অন্য গ্রাহকের সাথে যুক্ত`);
      }
    }
    data.phone = cleanPhone;
  }

  if (input.address !== undefined) {
    data.address = input.address?.trim() ? input.address.trim() : null;
  }

  if (input.total_due !== undefined) {
    data.total_due = input.total_due !== null ? Number(input.total_due) : 0;
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    address: updated.address,
    total_due: updated.total_due ?? 0,
    due: updated.total_due ?? 0,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

/**
 * Delete a customer by ID
 */
export async function deleteCustomer(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("গ্রাহক আইডি আবশ্যক");
  }

  await prisma.customer.delete({
    where: { id },
  });

  return true;
}
