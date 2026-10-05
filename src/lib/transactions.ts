import { Prisma, PrismaClient } from "@prisma/client";

import { calculateAndUpdateCustomerDue } from "@/lib/customers";
import { prisma } from "@/lib/prisma";
import { calculateProductReportData } from "@/lib/products";

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
  amount: number;
  paid_amount: number;
  due_amount: number;
  description?: string | null;
  date: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface TransactionInput {
  customer_id: string;
  amount: number;
  paid_amount?: number;
  due_amount?: number;
  description?: string | null;
  date?: Date | string;
}

export interface GetTransactionsOptions {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  skip?: number;
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
  phone?: string | null;
  address?: string | null;
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
  avgSaleAmount: number;
  simpleProfit: number;
  otherCosts: number;
  netProfit: number;
  totalProductSaleWeight?: number;
  totalProductSalePrice?: number;
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
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  txCount: number;
}

export interface GetCentralSalesReportOptions {
  startDate?: string;
  endDate?: string;
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
    const skip = options.skip !== undefined ? options.skip : (page - 1) * limit;

    const whereClause: {
      customer_id: string;
      AND?: Array<Record<string, unknown>>;
    } = {
      customer_id: customerId,
    };

    const conditions: Array<Record<string, unknown>> = [];

    if (options.search?.trim()) {
      const term = options.search.trim();
      conditions.push({
        OR: [{ description: { contains: term, mode: "insensitive" as const } }],
      });
    }

    if (options.startDate) {
      conditions.push({
        date: { gte: new Date(`${options.startDate}T00:00:00.000Z`) },
      });
    }

    if (options.endDate) {
      conditions.push({
        date: { lte: new Date(`${options.endDate}T23:59:59.999Z`) },
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
        amount: t.amount,
        paid_amount: t.paid_amount,
        due_amount: t.due_amount,
        description: t.description,
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
      amount: t.amount,
      paid_amount: t.paid_amount,
      due_amount: t.due_amount,
      description: t.description,
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
        amount: true,
        paid_amount: true,
        due_amount: true,
      },
    });

    let totalSales = 0;
    let totalDebit = 0;
    let totalPaid = 0;

    for (const t of transactions) {
      const amount = Number(t.amount) || 0;
      const due = Number(t.due_amount) || 0;
      const paid = Number(t.paid_amount) || 0;

      totalSales += amount;
      totalDebit += amount > 0 ? amount : due > 0 && paid === 0 ? due : 0;
      totalPaid += paid;
    }

    const netDue = Math.max(0, totalDebit - totalPaid);

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
 * Create a new manual transaction for a customer with automatic total_due update & rollback.
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

  const amount = Math.max(0, Number(input.amount) || 0);
  const paid_amount = Math.max(0, Number(input.paid_amount) || 0);
  let due_amount = Math.max(0, Number(input.due_amount) || 0);

  if (input.due_amount === undefined) {
    due_amount = Math.max(0, amount - paid_amount);
  }

  const date = input.date ? new Date(input.date) : new Date();

  const record = await prisma.transaction.create({
    data: {
      customer_id: input.customer_id,
      amount,
      paid_amount,
      due_amount,
      description: input.description?.trim() || null,
      date,
    },
  });

  // Calculate and update customer's total due with rollback safety
  try {
    await calculateAndUpdateCustomerDue(input.customer_id);
  } catch (error) {
    // Rollback created transaction if customer due update failed
    await prisma.transaction.delete({ where: { id: record.id } }).catch(() => {});
    throw error;
  }

  return {
    id: record.id,
    customer_id: record.customer_id,
    amount: record.amount,
    paid_amount: record.paid_amount,
    due_amount: record.due_amount,
    description: record.description,
    date: record.date,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

/**
 * Update an existing transaction with automatic total_due update & rollback.
 */
export async function updateTransaction(
  id: string,
  input: Partial<TransactionInput>
): Promise<Transaction> {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("লেনদেন খুঁজে পাওয়া যায়নি");
  }

  const dataToUpdate: {
    amount?: number;
    paid_amount?: number;
    due_amount?: number;
    description?: string | null;
    date?: Date;
  } = {};

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

  if (input.date !== undefined) {
    dataToUpdate.date = input.date ? new Date(input.date) : new Date();
  }

  const updated = await prisma.transaction.update({
    where: { id },
    data: dataToUpdate,
  });

  try {
    await calculateAndUpdateCustomerDue(updated.customer_id);
  } catch (error) {
    // Rollback to previous transaction state if customer due update fails
    await prisma.transaction
      .update({
        where: { id },
        data: {
          amount: existing.amount,
          paid_amount: existing.paid_amount,
          due_amount: existing.due_amount,
          description: existing.description,
          date: existing.date,
        },
      })
      .catch(() => {});
    throw error;
  }

  return {
    id: updated.id,
    customer_id: updated.customer_id,
    amount: updated.amount,
    paid_amount: updated.paid_amount,
    due_amount: updated.due_amount,
    description: updated.description,
    date: updated.date,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

/**
 * Delete a transaction with automatic total_due update & rollback.
 */
export async function deleteTransaction(id: string): Promise<boolean> {
  const existing = await prisma.transaction.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("লেনদেন খুঁজে পাওয়া যায়নি");
  }

  await prisma.transaction.delete({ where: { id } });

  try {
    await calculateAndUpdateCustomerDue(existing.customer_id);
  } catch (error) {
    // Rollback: recreate transaction if recalculation failed
    await prisma.transaction
      .create({
        data: {
          id: existing.id,
          customer_id: existing.customer_id,
          amount: existing.amount,
          paid_amount: existing.paid_amount,
          due_amount: existing.due_amount,
          description: existing.description,
          date: existing.date,
        },
      })
      .catch(() => {});
    throw error;
  }

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
          avgSaleAmount: 0,
          simpleProfit: 0,
          otherCosts: 0,
          netProfit: 0,
        },
        transactions: [],
        total: 0,
        totalPages: 1,
        currentPage: page,
        limit,
        dailyTrend: [],
        topCustomersBySales: [],
        topCustomersByDue: [],
      };
    }

    // 1. Build where conditions for transactions
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

    // Customer ID filter
    if (options.customerId && options.customerId !== "all") {
      andConditions.push({ customer_id: { equals: options.customerId } });
    }

    // Search filter across description, customer name, customer phone
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
            address: true,
            total_due: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
    });

    // 2. Compute company sales metrics
    let totalSales = 0;
    let totalCollected = 0;
    let totalDue = 0;

    // Daily map: date string (YYYY-MM-DD) -> metrics
    const dailyMap = new Map<
      string,
      { sales: number; collected: number; due: number; txCount: number; dateObj: Date }
    >();

    // Customer map: customerId -> sales summary
    const customerMap = new Map<string, CustomerSalesSummary>();

    for (const r of allRecords) {
      const itemSale = Number(r.amount) || 0;
      const itemCollected = Number(r.paid_amount) || 0;

      totalSales += itemSale;
      totalCollected += itemCollected;

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
      existingDay.due = parseFloat((existingDay.sales - existingDay.collected).toFixed(2));
      existingDay.txCount++;
      dailyMap.set(dateKey, existingDay);

      // Group by Customer
      if (r.customer) {
        const cId = r.customer.id;
        const cSummary = customerMap.get(cId) || {
          customerId: cId,
          customerName: r.customer.name,
          phone: r.customer.phone,
          totalSales: 0,
          totalPaid: 0,
          totalDue: Number(r.customer.total_due) || 0,
          txCount: 0,
        };
        cSummary.totalSales += itemSale;
        cSummary.totalPaid += itemCollected;
        cSummary.txCount++;
        customerMap.set(cId, cSummary);
      }
    }

    totalSales = parseFloat(totalSales.toFixed(2));
    totalCollected = parseFloat(totalCollected.toFixed(2));
    totalDue = parseFloat((totalSales - totalCollected).toFixed(2));
    const collectionRate =
      totalSales > 0 ? parseFloat(((totalCollected / totalSales) * 100).toFixed(1)) : 0;
    const avgSaleAmount =
      allRecords.length > 0 ? parseFloat((totalSales / allRecords.length).toFixed(2)) : 0;

    // 3. Compute Product Simple Profit (সরল মুনাফা)
    const products = await prisma.product.findMany({
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    let simpleProfit = 0;
    let totalProductSaleWeight = 0;
    let totalProductSalePrice = 0;

    for (const p of products) {
      const pReport = calculateProductReportData(
        p.transactions,
        options.startDate || undefined,
        options.endDate || undefined
      );
      simpleProfit += pReport.profit;
      totalProductSaleWeight += pReport.saleWeight;
      totalProductSalePrice += pReport.salePrice;
    }

    // 4. Compute Other Costs (অন্যান্য খরচ)
    const otherCostConditions: Prisma.OtherCostWhereInput[] = [];
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      otherCostConditions.push({ date: { gte: start, lte: end } });
    } else if (options.startDate) {
      const start = new Date(options.startDate);
      start.setHours(0, 0, 0, 0);
      otherCostConditions.push({ date: { gte: start } });
    } else if (options.endDate) {
      const end = new Date(options.endDate);
      end.setHours(23, 59, 59, 999);
      otherCostConditions.push({ date: { lte: end } });
    }

    const otherCostWhereClause: Prisma.OtherCostWhereInput =
      otherCostConditions.length > 0 ? { AND: otherCostConditions } : {};

    const otherCostsList = await prisma.otherCost.findMany({
      where: otherCostWhereClause,
    });

    const otherCosts = otherCostsList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    // 5. Compute Net Profit (নিট লাভ = সরল মুনাফা - অন্যান্য খরচ)
    const netProfit = simpleProfit - otherCosts;

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

    // 6. Paginated Transactions
    const total = allRecords.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const paginatedRecords = allRecords.slice(skip, skip + limit);

    const transactions: TransactionWithCustomer[] = paginatedRecords.map((r) => ({
      id: r.id,
      customer_id: r.customer_id,
      amount: r.amount,
      paid_amount: r.paid_amount,
      due_amount: r.due_amount,
      description: r.description,
      date: r.date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      customer: r.customer
        ? {
            id: r.customer.id,
            name: r.customer.name,
            phone: r.customer.phone,
            address: r.customer.address,
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
        avgSaleAmount,
        simpleProfit: parseFloat(simpleProfit.toFixed(2)),
        otherCosts: parseFloat(otherCosts.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        totalProductSaleWeight: parseFloat(totalProductSaleWeight.toFixed(2)),
        totalProductSalePrice: parseFloat(totalProductSalePrice.toFixed(2)),
      },
      transactions,
      total,
      totalPages,
      currentPage: page,
      limit,
      dailyTrend,
      topCustomersBySales,
      topCustomersByDue,
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
        avgSaleAmount: 0,
        simpleProfit: 0,
        otherCosts: 0,
        netProfit: 0,
      },
      transactions: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      limit: options.limit || 25,
      dailyTrend: [],
      topCustomersBySales: [],
      topCustomersByDue: [],
    };
  }
}
