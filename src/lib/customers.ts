import { prisma } from "@/lib/prisma";

export interface Customer {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CustomerInput {
  name: string;
  phone?: string | null;
  address?: string | null;
}

export interface GetCustomersOptions {
  search?: string;
  limit?: number;
  skip?: number;
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

  const { name, phone, address } = input;

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
    },
  });

  return {
    id: newCustomer.id,
    name: newCustomer.name,
    phone: newCustomer.phone,
    address: newCustomer.address,
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

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    address: updated.address,
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
