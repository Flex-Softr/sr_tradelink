import { CustomerType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export { CustomerType };

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_vip: boolean;
  type: CustomerType;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface CustomerInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  is_vip?: boolean;
  type?: CustomerType;
}

export interface GetCustomersOptions {
  search?: string;
  type?: CustomerType | "all";
  is_vip?: boolean;
  limit?: number;
  skip?: number;
}

let indexesEnsured = false;

/**
 * Ensure MongoDB indexes on customers collection are sparse
 * so multiple customers with null email/phone can coexist without collision.
 */
export async function ensureCustomerSparseIndexes(): Promise<void> {
  if (indexesEnsured) return;
  try {
    const listRes = (await prisma.$runCommandRaw({
      listIndexes: "customers",
    })) as { cursor?: { firstBatch?: Array<{ name: string; sparse?: boolean }> } };

    const indexes = listRes?.cursor?.firstBatch || [];
    const emailIndex = indexes.find((i) => i.name === "customers_email_key");
    const phoneIndex = indexes.find((i) => i.name === "customers_phone_key");

    if (emailIndex && !emailIndex.sparse) {
      await prisma.$runCommandRaw({ dropIndexes: "customers", index: "customers_email_key" });
    }
    if (phoneIndex && !phoneIndex.sparse) {
      await prisma.$runCommandRaw({ dropIndexes: "customers", index: "customers_phone_key" });
    }

    if (!emailIndex?.sparse || !phoneIndex?.sparse) {
      await prisma.$runCommandRaw({
        createIndexes: "customers",
        indexes: [
          { key: { email: 1 }, name: "customers_email_key", unique: true, sparse: true },
          { key: { phone: 1 }, name: "customers_phone_key", unique: true, sparse: true },
        ],
      });
    }

    indexesEnsured = true;
  } catch (error) {
    console.warn("Could not configure sparse indexes on customers collection:", error);
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
          email?: { contains: string; mode: "insensitive" };
          phone?: { contains: string; mode: "insensitive" };
          address?: { contains: string; mode: "insensitive" };
        }>;
        type?: { equals: CustomerType };
        is_vip?: { equals: boolean };
      }>;
    } = {};

    const conditions = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [
          { name: { contains: term, mode: "insensitive" as const } },
          { email: { contains: term, mode: "insensitive" as const } },
          { phone: { contains: term, mode: "insensitive" as const } },
          { address: { contains: term, mode: "insensitive" as const } },
        ],
      });
    }

    if (options.type && options.type !== "all") {
      conditions.push({
        type: { equals: options.type as CustomerType },
      });
    }

    if (options.is_vip !== undefined) {
      conditions.push({
        is_vip: { equals: options.is_vip },
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
      email: c.email,
      phone: c.phone,
      address: c.address,
      is_vip: c.is_vip,
      type: c.type,
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
      email: customer.email,
      phone: customer.phone,
      address: customer.address,
      is_vip: customer.is_vip,
      type: customer.type,
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

  const { name, email, phone, address, is_vip, type } = input;

  if (!name?.trim()) {
    throw new Error("গ্রাহকের নাম আবশ্যক");
  }

  const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;
  const cleanPhone = phone?.trim() ? phone.trim() : null;
  const cleanAddress = address?.trim() ? address.trim() : null;

  // Check unique email if provided
  if (cleanEmail) {
    const existingWithEmail = await prisma.customer.findFirst({
      where: { email: cleanEmail },
    });
    if (existingWithEmail) {
      throw new Error(`এই ইমেইল (${cleanEmail}) ইতিমধ্যে অন্য একজন গ্রাহকের জন্য ব্যবহৃত হয়েছে`);
    }
  }

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

  const validTypes: CustomerType[] = ["RETAIL", "WHOLESALE", "BOTH"];
  const finalType = type && validTypes.includes(type) ? type : "RETAIL";

  const newCustomer = await prisma.customer.create({
    data: {
      name: name.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      address: cleanAddress,
      is_vip: Boolean(is_vip),
      type: finalType,
    },
  });

  return {
    id: newCustomer.id,
    name: newCustomer.name,
    email: newCustomer.email,
    phone: newCustomer.phone,
    address: newCustomer.address,
    is_vip: newCustomer.is_vip,
    type: newCustomer.type,
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
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    is_vip?: boolean;
    type?: CustomerType;
  } = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("গ্রাহকের নাম খালি রাখা যাবে না");
    data.name = input.name.trim();
  }

  if (input.email !== undefined) {
    const cleanEmail = input.email?.trim() ? input.email.trim().toLowerCase() : null;
    if (cleanEmail && cleanEmail !== existing.email) {
      const duplicate = await prisma.customer.findFirst({
        where: { email: cleanEmail, NOT: { id } },
      });
      if (duplicate) {
        throw new Error(`এই ইমেইল (${cleanEmail}) ইতিমধ্যে অন্য গ্রাহকের সাথে যুক্ত`);
      }
    }
    data.email = cleanEmail;
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

  if (input.is_vip !== undefined) {
    data.is_vip = Boolean(input.is_vip);
  }

  if (input.type !== undefined) {
    const validTypes: CustomerType[] = ["RETAIL", "WHOLESALE", "BOTH"];
    data.type = validTypes.includes(input.type) ? input.type : "RETAIL";
  }

  const updated = await prisma.customer.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    name: updated.name,
    email: updated.email,
    phone: updated.phone,
    address: updated.address,
    is_vip: updated.is_vip,
    type: updated.type,
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
