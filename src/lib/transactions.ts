import { CustomerType, Prisma, PrismaClient, TransactionType } from "@prisma/client";

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

export interface TransactionCustomerInfo {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  type?: string | null;
  is_vip?: boolean;
}

export interface TransactionWithCustomer extends Transaction {
  customer?: TransactionCustomerInfo | null;
}

export interface CentralSalesReportMetrics {
  totalSales: number;
  totalCollected: number;
  totalDue: number;
  netTurnover: number;
  collectionRate: number;
  totalTransactions: number;
  saleCount: number;
  paymentCount: number;
  dueCount: number;
  avgSaleAmount: number;
}

export interface DailySalesTrend {
  date: string;
  displayDate: string;
  sales: number;
  collected: number;
  due: number;
  txCount: number;
}

export interface CustomerSalesSummary {
  customerId: string;
  customerName: string;
  phone?: string | null;
  customerType?: string | null;
  isVip?: boolean;
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  txCount: number;
}

export interface GetCentralSalesReportOptions {
  startDate?: string;
  endDate?: string;
  type?: TransactionType | "all";
  customerType?: string | "all";
  customerId?: string | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export interface CentralSalesReportResult {
  metrics: CentralSalesReportMetrics;
  transactions: TransactionWithCustomer[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  dailyTrend: DailySalesTrend[];
  topCustomersBySales: CustomerSalesSummary[];
  topCustomersByDue: CustomerSalesSummary[];
  customerTypeBreakdown: {
    retailSales: number;
    wholesaleSales: number;
    bothSales: number;
    retailCount: number;
    wholesaleCount: number;
  };
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
        "⚠️ [Prisma] 'transaction' model is not yet loaded in the running process. Please restart your dev server ('npm run dev') to apply new schema."
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
      "Prisma Transaction মডেলটি পাওয়া যায়নি। অনুগ্রহ করে dev সার্ভারটি রিস্টার্ট করুন ('npm run dev')।"
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
      "Prisma Transaction মডেলটি পাওয়া যায়নি। অনুগ্রহ করে dev সার্ভারটি রিস্টার্ট করুন ('npm run dev')।"
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
      "Prisma Transaction মডেলটি পাওয়া যায়নি। অনুগ্রহ করে dev সার্ভারটি রিস্টার্ট করুন ('npm run dev')।"
    );
  }
  const existing = await txModel.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("লেনদেন খুঁজে পাওয়া যায়নি");
  }

  await txModel.delete({ where: { id } });
  return true;
}

/**
 * Fetch and calculate central sales report data across all company transactions.
 */
export async function getCentralSalesReportData(
  options: GetCentralSalesReportOptions = {}
): Promise<CentralSalesReportResult> {
  try {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, options.limit || 25);
    const txModel = getTxModel();

    if (!txModel) {
      return {
        metrics: {
          totalSales: 0,
          totalCollected: 0,
          totalDue: 0,
          netTurnover: 0,
          collectionRate: 0,
          totalTransactions: 0,
          saleCount: 0,
          paymentCount: 0,
          dueCount: 0,
          avgSaleAmount: 0,
        },
        transactions: [],
        total: 0,
        totalPages: 1,
        currentPage: page,
        limit,
        dailyTrend: [],
        topCustomersBySales: [],
        topCustomersByDue: [],
        customerTypeBreakdown: {
          retailSales: 0,
          wholesaleSales: 0,
          bothSales: 0,
          retailCount: 0,
          wholesaleCount: 0,
        },
      };
    }

    // 1. Build where conditions
    const andConditions: Prisma.TransactionWhereInput[] = [];

    // Date range
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      andConditions.push({ date: { gte: start, lte: end } });
    } else if (options.startDate) {
      const start = new Date(options.startDate);
      start.setHours(0, 0, 0, 0);
      andConditions.push({ date: { gte: start } });
    } else if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      andConditions.push({ date: { lte: end } });
    }

    // Type filter
    if (options.type && options.type !== "all") {
      andConditions.push({ type: { equals: options.type } });
    }

    // Customer ID filter
    if (options.customerId && options.customerId !== "all") {
      andConditions.push({ customer_id: { equals: options.customerId } });
    }

    // Customer Type filter
    if (options.customerType && options.customerType !== "all") {
      const customersOfType = await prisma.customer.findMany({
        where: { type: options.customerType as CustomerType },
        select: { id: true },
      });
      const ids = customersOfType.map((c) => c.id);
      andConditions.push({ customer_id: { in: ids } });
    }

    // Search filter across reference, description, customer name, customer phone
    if (options.search?.trim()) {
      const term = options.search.trim();
      const matchedCustomers = await prisma.customer.findMany({
        where: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { phone: { contains: term, mode: "insensitive" } },
          ],
        },
        select: { id: true },
      });
      const matchedCustIds = matchedCustomers.map((c) => c.id);

      andConditions.push({
        OR: [
          { description: { contains: term, mode: "insensitive" } },
          { reference: { contains: term, mode: "insensitive" } },
          ...(matchedCustIds.length > 0 ? [{ customer_id: { in: matchedCustIds } }] : []),
        ],
      });
    }

    const whereClause: Prisma.TransactionWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // Fetch all records matching the filters for metrics and aggregation
    const allRecords = await txModel.findMany({
      where: whereClause,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            address: true,
            type: true,
            is_vip: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
    });

    // 2. Compute company sales metrics
    let totalSales = 0;
    let totalCollected = 0;
    let totalDue = 0;
    let saleCount = 0;
    let paymentCount = 0;
    let dueCount = 0;

    // Daily map: date string (YYYY-MM-DD) -> metrics
    const dailyMap = new Map<
      string,
      { sales: number; collected: number; due: number; txCount: number; dateObj: Date }
    >();

    // Customer map: customerId -> sales summary
    const customerMap = new Map<string, CustomerSalesSummary>();

    // Customer type breakdown
    let retailSales = 0;
    let wholesaleSales = 0;
    let bothSales = 0;
    let retailCount = 0;
    let wholesaleCount = 0;

    for (const r of allRecords) {
      const amount = Number(r.amount) || 0;
      const paid = Number(r.paid_amount) || 0;
      const due = Number(r.due_amount) || 0;

      let itemSale = 0;
      let itemCollected = 0;
      let itemDue = 0;

      if (r.type === "SALE") {
        saleCount++;
        itemSale = amount;
        itemCollected = paid;
        itemDue = due > 0 ? due : Math.max(0, amount - paid);
      } else if (r.type === "PAYMENT") {
        paymentCount++;
        itemSale = 0;
        itemCollected = paid > 0 ? paid : amount;
        itemDue = 0;
      } else if (r.type === "DUE") {
        dueCount++;
        itemSale = 0;
        itemCollected = paid;
        itemDue = due > 0 ? due : amount;
      }

      totalSales += itemSale;
      totalCollected += itemCollected;
      totalDue += itemDue;

      // Group by Day
      const dObj = new Date(r.date);
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dObj.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const existingDay = dailyMap.get(dateKey) || {
        sales: 0,
        collected: 0,
        due: 0,
        txCount: 0,
        dateObj: dObj,
      };
      existingDay.sales += itemSale;
      existingDay.collected += itemCollected;
      existingDay.due += itemDue;
      existingDay.txCount++;
      dailyMap.set(dateKey, existingDay);

      // Group by Customer
      if (r.customer) {
        const cId = r.customer.id;
        const cSummary = customerMap.get(cId) || {
          customerId: cId,
          customerName: r.customer.name,
          phone: r.customer.phone,
          customerType: r.customer.type,
          isVip: r.customer.is_vip,
          totalSales: 0,
          totalPaid: 0,
          totalDue: 0,
          txCount: 0,
        };
        cSummary.totalSales += itemSale;
        cSummary.totalPaid += itemCollected;
        cSummary.totalDue += itemDue;
        cSummary.txCount++;
        customerMap.set(cId, cSummary);

        // Type breakdown
        if (r.customer.type === "WHOLESALE") {
          wholesaleSales += itemSale;
          wholesaleCount++;
        } else if (r.customer.type === "RETAIL") {
          retailSales += itemSale;
          retailCount++;
        } else {
          bothSales += itemSale;
        }
      }
    }

    totalSales = parseFloat(totalSales.toFixed(2));
    totalCollected = parseFloat(totalCollected.toFixed(2));
    totalDue = parseFloat(totalDue.toFixed(2));
    const collectionRate =
      totalSales > 0 ? parseFloat(((totalCollected / totalSales) * 100).toFixed(1)) : 0;
    const avgSaleAmount = saleCount > 0 ? parseFloat((totalSales / saleCount).toFixed(2)) : 0;

    // Convert dailyMap to sorted array
    const dailyTrend: DailySalesTrend[] = Array.from(dailyMap.entries())
      .map(([date, val]) => {
        const d = val.dateObj;
        const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
        return {
          date,
          displayDate,
          sales: parseFloat(val.sales.toFixed(2)),
          collected: parseFloat(val.collected.toFixed(2)),
          due: parseFloat(val.due.toFixed(2)),
          txCount: val.txCount,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top customers by Sales
    const topCustomersBySales = Array.from(customerMap.values())
      .filter((c) => c.totalSales > 0)
      .sort((a, b) => b.totalSales - a.totalSales)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        totalSales: parseFloat(c.totalSales.toFixed(2)),
        totalPaid: parseFloat(c.totalPaid.toFixed(2)),
        totalDue: parseFloat(c.totalDue.toFixed(2)),
      }));

    // Top customers with Outstanding Due
    const topCustomersByDue = Array.from(customerMap.values())
      .filter((c) => c.totalDue > 0)
      .sort((a, b) => b.totalDue - a.totalDue)
      .slice(0, 5)
      .map((c) => ({
        ...c,
        totalSales: parseFloat(c.totalSales.toFixed(2)),
        totalPaid: parseFloat(c.totalPaid.toFixed(2)),
        totalDue: parseFloat(c.totalDue.toFixed(2)),
      }));

    // 3. Paginated Transactions
    const total = allRecords.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const paginatedRecords = allRecords.slice(skip, skip + limit);

    const transactions: TransactionWithCustomer[] = paginatedRecords.map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      type: r.type,
      amount: r.amount,
      paid_amount: r.paid_amount,
      due_amount: r.due_amount,
      description: r.description,
      reference: r.reference,
      date: r.date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      customer: r.customer
        ? {
            id: r.customer.id,
            name: r.customer.name,
            phone: r.customer.phone,
            email: r.customer.email,
            address: r.customer.address,
            type: r.customer.type,
            is_vip: r.customer.is_vip,
          }
        : null,
    }));

    return {
      metrics: {
        totalSales,
        totalCollected,
        totalDue,
        netTurnover: totalSales,
        collectionRate,
        totalTransactions: total,
        saleCount,
        paymentCount,
        dueCount,
        avgSaleAmount,
      },
      transactions,
      total,
      totalPages,
      currentPage: page,
      limit,
      dailyTrend,
      topCustomersBySales,
      topCustomersByDue,
      customerTypeBreakdown: {
        retailSales: parseFloat(retailSales.toFixed(2)),
        wholesaleSales: parseFloat(wholesaleSales.toFixed(2)),
        bothSales: parseFloat(bothSales.toFixed(2)),
        retailCount,
        wholesaleCount,
      },
    };
  } catch (error) {
    console.error("Error in getCentralSalesReportData:", error);
    return {
      metrics: {
        totalSales: 0,
        totalCollected: 0,
        totalDue: 0,
        netTurnover: 0,
        collectionRate: 0,
        totalTransactions: 0,
        saleCount: 0,
        paymentCount: 0,
        dueCount: 0,
        avgSaleAmount: 0,
      },
      transactions: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      limit: options.limit || 25,
      dailyTrend: [],
      topCustomersBySales: [],
      topCustomersByDue: [],
      customerTypeBreakdown: {
        retailSales: 0,
        wholesaleSales: 0,
        bothSales: 0,
        retailCount: 0,
        wholesaleCount: 0,
      },
    };
  }
}
