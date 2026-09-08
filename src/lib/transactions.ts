import { PrismaClient, TransactionType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export { TransactionType };

/**
 * Safe accessor for prisma.transaction model that handles Next.js hot-reload stale client cache in dev.
 */
function getTxModel() {
  if (prisma && (prisma as unknown as { transaction?: typeof prisma.transaction }).transaction) {
    return prisma.transaction;
  }
  const fresh = new PrismaClient();
  (globalThis as unknown as { prisma: PrismaClient }).prisma = fresh;
  return fresh.transaction;
}

export interface Transaction {
  id: string;
  customer_id: string;
  type: TransactionType;
  amount: number;
  paid_amount: number;
  due_amount: number;
  description?: string | null;
  reference?: string | null;
  date: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface TransactionInput {
  customer_id: string;
  type?: TransactionType;
  amount: number;
  paid_amount?: number;
  due_amount?: number;
  description?: string | null;
  reference?: string | null;
  date?: Date | string;
}

export interface GetTransactionsOptions {
  search?: string;
  type?: TransactionType | "all";
  page?: number;
  limit?: number;
}

export interface CustomerTransactionSummary {
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  transactionCount: number;
}

/**
 * Fetch all transactions for a specific customer with optional search, type filtering, and pagination.
 */
export async function getTransactionsByCustomerId(
  customerId: string,
  options: GetTransactionsOptions = {}
): Promise<{
  transactions: Transaction[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
}> {
  try {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 20);
    const skip = (page - 1) * limit;

    const whereClause: {
      customer_id: string;
      AND?: Array<{
        OR?: Array<{
          description?: { contains: string; mode: "insensitive" };
          reference?: { contains: string; mode: "insensitive" };
        }>;
        type?: { equals: TransactionType };
      }>;
    } = {
      customer_id: customerId,
    };

    const conditions = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [
          { description: { contains: term, mode: "insensitive" as const } },
          { reference: { contains: term, mode: "insensitive" as const } },
        ],
      });
    }

    if (options.type && options.type !== "all") {
      conditions.push({
        type: { equals: options.type as TransactionType },
      });
    }

    if (conditions.length > 0) {
      whereClause.AND = conditions;
    }

    const txModel = getTxModel();
    if (!txModel) {
      console.warn(
        "⚠️ [Prisma] 'transaction' model is not yet loaded in the running process. Please restart your dev server ('pnpm dev') to apply new schema."
      );
      return {
        transactions: [],
        total: 0,
        totalPages: 1,
        currentPage: page,
        limit,
      };
    }

    const [total, records] = await Promise.all([
      txModel.count({ where: whereClause }),
      txModel.findMany({
        where: whereClause,
        orderBy: [{ date: "desc" }, { created_at: "desc" }],
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
      transactions: records.map((t) => ({
        id: t.id,
        customer_id: t.customer_id,
        type: t.type,
        amount: t.amount,
        paid_amount: t.paid_amount,
        due_amount: t.due_amount,
        description: t.description,
        reference: t.reference,
        date: t.date,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      total,
      totalPages,
      currentPage: page,
      limit,
    };
  } catch (error) {
    console.error(`Error fetching transactions for customer ${customerId}:`, error);
    return {
      transactions: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      limit: options.limit || 20,
    };
  }
}

/**
 * Fetch a single transaction by ID
 */
export async function getTransactionById(id: string): Promise<Transaction | null> {
  try {
    const txModel = getTxModel();
    if (!txModel) return null;
    const t = await txModel.findUnique({
      where: { id },
    });
    if (!t) return null;

    return {
      id: t.id,
      customer_id: t.customer_id,
      type: t.type,
      amount: t.amount,
      paid_amount: t.paid_amount,
      due_amount: t.due_amount,
      description: t.description,
      reference: t.reference,
      date: t.date,
      created_at: t.created_at,
      updated_at: t.updated_at,
    };
  } catch (error) {
    console.error(`Error fetching transaction ${id}:`, error);
    return null;
  }
}

/**
 * Calculate total sales, total paid, and total due for a customer.
 */
export async function getCustomerTransactionSummary(
  customerId: string
): Promise<CustomerTransactionSummary> {
  try {
    const txModel = getTxModel();
    if (!txModel) {
      return {
        totalSales: 0,
        totalPaid: 0,
        totalDue: 0,
        transactionCount: 0,
      };
    }
    const transactions = await txModel.findMany({
      where: { customer_id: customerId },
      select: {
        type: true,
        amount: true,
        paid_amount: true,
        due_amount: true,
      },
    });

    let totalSales = 0;
    let totalPaid = 0;
    let totalDueAddition = 0;

    for (const t of transactions) {
      if (t.type === "SALE") {
        totalSales += t.amount || 0;
        totalPaid += t.paid_amount || 0;
      } else if (t.type === "PAYMENT") {
        // Payment made towards previous due
        totalPaid += t.paid_amount || t.amount || 0;
      } else if (t.type === "DUE") {
        // Opening or manual due adjustment
        totalDueAddition += t.amount || t.due_amount || 0;
        totalPaid += t.paid_amount || 0;
      }
    }

    const netDue = Math.max(0, totalSales + totalDueAddition - totalPaid);

    return {
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      totalDue: parseFloat(netDue.toFixed(2)),
      transactionCount: transactions.length,
    };
  } catch (error) {
    console.error(`Error calculating summary for customer ${customerId}:`, error);
    return {
      totalSales: 0,
      totalPaid: 0,
      totalDue: 0,
      transactionCount: 0,
    };
  }
}

/**
 * Create a new manual transaction for a customer.
 */
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  if (!input.customer_id) {
    throw new Error("গ্রাহকের আইডি প্রদান করা আবশ্যক");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customer_id },
  });
  if (!customer) {
    throw new Error("গ্রাহক খুঁজে পাওয়া যায়নি");
  }

  const type = input.type || "SALE";
  const amount = Math.max(0, Number(input.amount) || 0);
  let paid_amount = Math.max(0, Number(input.paid_amount) || 0);
  let due_amount = Math.max(0, Number(input.due_amount) || 0);

  // If user provided amount and paid_amount for SALE, and due_amount was not specified, compute it
  if (type === "SALE" && input.due_amount === undefined) {
    due_amount = Math.max(0, amount - paid_amount);
  } else if (type === "PAYMENT") {
    // If it's a payment, if paid_amount is 0 but amount was given, set paid_amount = amount
    if (paid_amount === 0 && amount > 0) {
      paid_amount = amount;
    }
  } else if (type === "DUE") {
    // If it's a pure due entry, default due_amount = amount
    if (due_amount === 0 && amount > 0) {
      due_amount = amount;
    }
  }

  const date = input.date ? new Date(input.date) : new Date();

  const txModel = getTxModel();
  if (!txModel) {
    throw new Error(
      "Prisma Transaction মডেলটি পাওয়া যায়নি। অনুগ্রহ করে dev সার্ভারটি রিস্টার্ট করুন ('pnpm dev')।"
    );
  }
  const record = await txModel.create({
    data: {
      customer_id: input.customer_id,
      type,
      amount,
      paid_amount,
      due_amount,
      description: input.description?.trim() || null,
      reference: input.reference?.trim() || null,
      date,
    },
  });

  return {
    id: record.id,
    customer_id: record.customer_id,
    type: record.type,
    amount: record.amount,
    paid_amount: record.paid_amount,
    due_amount: record.due_amount,
    description: record.description,
    reference: record.reference,
    date: record.date,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

/**
 * Update an existing transaction.
 */
export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>
): Promise<Transaction> {
  const txModel = getTxModel();
  if (!txModel) {
    throw new Error(
      "Prisma Transaction মডেলটি পাওয়া যায়নি। অনুগ্রহ করে dev সার্ভারটি রিস্টার্ট করুন ('pnpm dev')।"
    );
  }
  const existing = await txModel.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("লেনদেন খুঁজে পাওয়া যায়নি");
  }

  const dataToUpdate: {
    type?: TransactionType;
    amount?: number;
    paid_amount?: number;
    due_amount?: number;
    description?: string | null;
    reference?: string | null;
    date?: Date;
  } = {};

  if (input.type !== undefined) {
    dataToUpdate.type = input.type;
  }

  if (input.amount !== undefined) {
    dataToUpdate.amount = Math.max(0, Number(input.amount) || 0);
  }

  if (input.paid_amount !== undefined) {
    dataToUpdate.paid_amount = Math.max(0, Number(input.paid_amount) || 0);
  }

  if (input.due_amount !== undefined) {
    dataToUpdate.due_amount = Math.max(0, Number(input.due_amount) || 0);
  }

  if (input.description !== undefined) {
    dataToUpdate.description = input.description ? input.description.trim() : null;
  }

  if (input.reference !== undefined) {
    dataToUpdate.reference = input.reference ? input.reference.trim() : null;
  }

  if (input.date !== undefined) {
    dataToUpdate.date = input.date ? new Date(input.date) : new Date();
  }

  const updated = await txModel.update({
    where: { id },
    data: dataToUpdate,
  });

  return {
    id: updated.id,
    customer_id: updated.customer_id,
    type: updated.type,
    amount: updated.amount,
    paid_amount: updated.paid_amount,
    due_amount: updated.due_amount,
    description: updated.description,
    reference: updated.reference,
    date: updated.date,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

/**
 * Delete a transaction.
 */
export async function deleteTransaction(id: string): Promise<boolean> {
  const txModel = getTxModel();
  if (!txModel) {
    throw new Error(
      "Prisma Transaction মডেলটি পাওয়া যায়নি। অনুগ্রহ করে dev সার্ভারটি রিস্টার্ট করুন ('pnpm dev')।"
    );
  }
  const existing = await txModel.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("লেনদেন খুঁজে পাওয়া যায়নি");
  }

  await txModel.delete({ where: { id } });
  return true;
}
