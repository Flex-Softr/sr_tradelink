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
  totalSaleWeight: number;
  totalPurchaseCost: number;
  totalPurchaseWeight: number;
  totalCollected: number;
  totalDue: number;
  netTurnover: number;
  collectionRate: number;
  totalTransactions: number;
  avgSaleAmount: number;
  avgSellRate: number;
  avgBuyRate: number;
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
  saleWeight?: number;
  purchases?: number;
  purchaseWeight?: number;
  profit?: number;
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

export interface ProductSalesSummary {
  productId: string;
  productName: string;
  subtitle?: string | null;
  saleWeight: number;
  salePrice: number;
  buyWeight: number;
  buyPrice: number;
  buyRate: number;
  sellRate: number;
  profit: number;
  txCount: number;
}

export interface ProductTransactionReportItem {
  id: string;
  product_id: string;
  productName: string;
  productSubtitle?: string | null;
  date: Date | string;
  kroyweight: number;
  kroyprice: number;
  dailysaleweight: number;
  dailysaleprice: number;
  sellRate: number;
  buyRate: number;
  profit: number;
  amount?: number;
  paid_amount?: number;
  due_amount?: number;
  description?: string | null;
  customer?: TransactionCustomerInfo | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface GetCentralSalesReportOptions {
  startDate?: string;
  endDate?: string;
  productId?: string | "all";
  customerId?: string | "all";
  search?: string;
  page?: number;
  limit?: number;
}

export interface CentralSalesReportResult {
  metrics: CentralSalesReportMetrics;
  transactions: ProductTransactionReportItem[];
  productsSummary: ProductSalesSummary[];
  topProductsBySales: ProductSalesSummary[];
  topProductsByProfit: ProductSalesSummary[];
  topCustomersBySales: CustomerSalesSummary[];
  topCustomersByDue: CustomerSalesSummary[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  dailyTrend: DailySalesTrend[];
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
 * Fetch and calculate central sales report data across all company product transactions.
 */
export async function getCentralSalesReportData(
  options: GetCentralSalesReportOptions = {}
): Promise<CentralSalesReportResult> {
  try {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(options.limit) || 25));

    // 1. Build where conditions for product transactions
    const andConditions: Prisma.ProductTransactionWhereInput[] = [];

    // Date range validation
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        andConditions.push({ date: { gte: start, lte: end } });
      }
    } else if (options.startDate) {
      const start = new Date(options.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        andConditions.push({ date: { gte: start } });
      }
    } else if (options.endDate) {
      const end = new Date(options.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        andConditions.push({ date: { lte: end } });
      }
    }

    // Product ID filter with strict ObjectId validation
    const rawProductId =
      options.productId && options.productId !== "all"
        ? options.productId
        : options.customerId && options.customerId !== "all"
          ? options.customerId
          : undefined;

    const activeProductId =
      rawProductId && /^[0-9a-fA-F]{24}$/.test(rawProductId.trim())
        ? rawProductId.trim()
        : undefined;

    if (activeProductId) {
      andConditions.push({ product_id: { equals: activeProductId } });
    }

    // Search filter across product name, subtitle, description (capped to 100 chars)
    if (options.search?.trim()) {
      const term = options.search.trim().slice(0, 100);
      andConditions.push({
        product: {
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { subtitle: { contains: term, mode: "insensitive" } },
            { description: { contains: term, mode: "insensitive" } },
          ],
        },
      });
    }

    const whereClause: Prisma.ProductTransactionWhereInput =
      andConditions.length > 0 ? { AND: andConditions } : {};

    // 2. Fetch all products with transactions to compute accurate buy rates and profits
    const allProducts = await prisma.product.findMany({
      include: {
        transactions: {
          orderBy: { date: "desc" },
        },
      },
    });

    const productBuyRateMap = new Map<string, number>();
    const productReportMap = new Map<string, ReturnType<typeof calculateProductReportData>>();

    for (const p of allProducts) {
      const pReport = calculateProductReportData(
        p.transactions.map((t) => ({
          id: t.id,
          product_id: t.product_id,
          date: t.date,
          kroyweight: t.kroyweight,
          kroyprice: t.kroyprice,
          dailysaleweight: t.dailysaleweight,
          dailysaleprice: t.dailysaleprice,
          created_at: t.created_at,
          updated_at: t.updated_at,
        })),
        options.startDate || undefined,
        options.endDate || undefined
      );

      // If pReport has 0 buyRate, fallback to product.price if available
      let effectiveBuyRate = pReport.buyRate;
      if (effectiveBuyRate === 0 && p.price && Number(p.price) > 0) {
        effectiveBuyRate = Number(p.price);
      }

      productBuyRateMap.set(p.id, effectiveBuyRate);
      productReportMap.set(p.id, pReport);
    }

    // 3. Fetch all matching product transaction records
    const allRecords = await prisma.productTransaction.findMany({
      where: whereClause,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            subtitle: true,
            price: true,
          },
        },
      },
      orderBy: [{ date: "desc" }, { created_at: "desc" }],
    });

    let totalSales = 0;
    let totalSaleWeight = 0;
    let totalPurchaseCost = 0;
    let totalPurchaseWeight = 0;

    // Daily map: date string (YYYY-MM-DD) -> metrics
    const dailyMap = new Map<
      string,
      {
        sales: number;
        saleWeight: number;
        purchases: number;
        purchaseWeight: number;
        profit: number;
        txCount: number;
        dateObj: Date;
      }
    >();

    // Product summary map
    const productSummaryMap = new Map<string, ProductSalesSummary>();

    for (const r of allRecords) {
      const itemSalePrice = Number(r.dailysaleprice || 0);
      const itemSaleWeight = Number(r.dailysaleweight || 0);
      const itemBuyPrice = Number(r.kroyprice || 0);
      const itemBuyWeight = Number(r.kroyweight || 0);

      totalSales += itemSalePrice;
      totalSaleWeight += itemSaleWeight;
      totalPurchaseCost += itemBuyPrice;
      totalPurchaseWeight += itemBuyWeight;

      const pBuyRate = productBuyRateMap.get(r.product_id) || 0;
      const itemProfit =
        itemSaleWeight > 0 && pBuyRate > 0 ? itemSalePrice - itemSaleWeight * pBuyRate : 0;

      // Group by Day
      const dObj = new Date(r.date);
      const yyyy = dObj.getFullYear();
      const mm = String(dObj.getMonth() + 1).padStart(2, "0");
      const dd = String(dObj.getDate()).padStart(2, "0");
      const dateKey = `${yyyy}-${mm}-${dd}`;

      const existingDay = dailyMap.get(dateKey) || {
        sales: 0,
        saleWeight: 0,
        purchases: 0,
        purchaseWeight: 0,
        profit: 0,
        txCount: 0,
        dateObj: dObj,
      };

      existingDay.sales += itemSalePrice;
      existingDay.saleWeight += itemSaleWeight;
      existingDay.purchases += itemBuyPrice;
      existingDay.purchaseWeight += itemBuyWeight;
      existingDay.profit += itemProfit;
      existingDay.txCount++;
      dailyMap.set(dateKey, existingDay);

      // Group by Product
      const pId = r.product_id;
      const pName = r.product?.name || "অজানা পণ্য";
      const pSub = r.product?.subtitle || null;
      const existingProduct = productSummaryMap.get(pId) || {
        productId: pId,
        productName: pName,
        subtitle: pSub,
        saleWeight: 0,
        salePrice: 0,
        buyWeight: 0,
        buyPrice: 0,
        buyRate: pBuyRate,
        sellRate: 0,
        profit: 0,
        txCount: 0,
      };

      existingProduct.saleWeight += itemSaleWeight;
      existingProduct.salePrice += itemSalePrice;
      existingProduct.buyWeight += itemBuyWeight;
      existingProduct.buyPrice += itemBuyPrice;
      existingProduct.profit += itemProfit;
      existingProduct.txCount++;
      productSummaryMap.set(pId, existingProduct);
    }

    totalSales = parseFloat(totalSales.toFixed(2));
    totalSaleWeight = parseFloat(totalSaleWeight.toFixed(2));
    totalPurchaseCost = parseFloat(totalPurchaseCost.toFixed(2));
    totalPurchaseWeight = parseFloat(totalPurchaseWeight.toFixed(2));

    const totalTransactions = allRecords.length;
    const avgSaleAmount =
      totalTransactions > 0 ? parseFloat((totalSales / totalTransactions).toFixed(2)) : 0;
    const avgSellRate =
      totalSaleWeight > 0 ? parseFloat((totalSales / totalSaleWeight).toFixed(2)) : 0;
    const avgBuyRate =
      totalPurchaseWeight > 0
        ? parseFloat((totalPurchaseCost / totalPurchaseWeight).toFixed(2))
        : 0;

    // 4. Product summaries sorted
    const productsSummary: ProductSalesSummary[] = Array.from(productSummaryMap.values())
      .map((ps) => {
        const sWeight = parseFloat(ps.saleWeight.toFixed(2));
        const sPrice = parseFloat(ps.salePrice.toFixed(2));
        const bWeight = parseFloat(ps.buyWeight.toFixed(2));
        const bPrice = parseFloat(ps.buyPrice.toFixed(2));
        const bRate = bWeight > 0 ? parseFloat((bPrice / bWeight).toFixed(2)) : ps.buyRate;
        const sRate = sWeight > 0 ? parseFloat((sPrice / sWeight).toFixed(2)) : 0;
        const pProfit = parseFloat(ps.profit.toFixed(2));

        return {
          ...ps,
          saleWeight: sWeight,
          salePrice: sPrice,
          buyWeight: bWeight,
          buyPrice: bPrice,
          buyRate: bRate,
          sellRate: sRate,
          profit: pProfit,
        };
      })
      .sort((a, b) => b.salePrice - a.salePrice);

    // Compute simpleProfit directly from the product summaries for penny-for-penny consistency
    const simpleProfit = parseFloat(
      productsSummary.reduce((sum, p) => sum + p.profit, 0).toFixed(2)
    );

    // 5. Compute Other Costs (অন্যান্য খরচ)
    const otherCostConditions: Prisma.OtherCostWhereInput[] = [];
    if (options.startDate && options.endDate) {
      const start = new Date(options.startDate);
      const end = new Date(options.endDate);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        otherCostConditions.push({ date: { gte: start, lte: end } });
      }
    } else if (options.startDate) {
      const start = new Date(options.startDate);
      if (!isNaN(start.getTime())) {
        start.setHours(0, 0, 0, 0);
        otherCostConditions.push({ date: { gte: start } });
      }
    } else if (options.endDate) {
      const end = new Date(options.endDate);
      if (!isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        otherCostConditions.push({ date: { lte: end } });
      }
    }

    const otherCostWhereClause: Prisma.OtherCostWhereInput =
      otherCostConditions.length > 0 ? { AND: otherCostConditions } : {};

    const otherCostsList = await prisma.otherCost.findMany({
      where: otherCostWhereClause,
    });

    const otherCosts = parseFloat(
      otherCostsList.reduce((sum, c) => sum + (Number(c.amount) || 0), 0).toFixed(2)
    );

    // 6. Net Profit (নিট লাভ = সরল মুনাফা - অন্যান্য খরচ)
    const netProfit = parseFloat((simpleProfit - otherCosts).toFixed(2));

    // Convert dailyMap to sorted array
    const dailyTrend: DailySalesTrend[] = Array.from(dailyMap.entries())
      .map(([date, val]) => {
        const d = val.dateObj;
        const displayDate = `${d.getDate()}/${d.getMonth() + 1}`;
        const s = parseFloat(val.sales.toFixed(2));
        return {
          date,
          displayDate,
          sales: s,
          saleWeight: parseFloat(val.saleWeight.toFixed(2)),
          purchases: parseFloat(val.purchases.toFixed(2)),
          purchaseWeight: parseFloat(val.purchaseWeight.toFixed(2)),
          profit: parseFloat(val.profit.toFixed(2)),
          collected: s,
          due: 0,
          txCount: val.txCount,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));

    // Top products by sales
    const topProductsBySales = [...productsSummary].filter((p) => p.salePrice > 0).slice(0, 5);

    // Top products by profit
    const topProductsByProfit = [...productsSummary]
      .filter((p) => p.profit > 0)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 5);

    // Backward compatibility for topCustomers
    const topCustomersBySales: CustomerSalesSummary[] = topProductsBySales.map((p) => ({
      customerId: p.productId,
      customerName: p.productName,
      phone: p.subtitle,
      totalSales: p.salePrice,
      totalPaid: p.salePrice,
      totalDue: 0,
      txCount: p.txCount,
    }));

    const topCustomersByDue: CustomerSalesSummary[] = [];

    // 7. Paginated Product Transactions
    const total = allRecords.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const skip = (page - 1) * limit;
    const paginatedRecords = allRecords.slice(skip, skip + limit);

    const transactions: ProductTransactionReportItem[] = paginatedRecords.map((r) => {
      const sPrice = Number(r.dailysaleprice || 0);
      const sWeight = Number(r.dailysaleweight || 0);
      const bPrice = Number(r.kroyprice || 0);
      const bWeight = Number(r.kroyweight || 0);
      const pBuyRate = productBuyRateMap.get(r.product_id) || 0;
      const sRate = sWeight > 0 ? parseFloat((sPrice / sWeight).toFixed(2)) : 0;
      const bRate = bWeight > 0 ? parseFloat((bPrice / bWeight).toFixed(2)) : pBuyRate;
      const pProfit =
        sWeight > 0 && pBuyRate > 0 ? parseFloat((sPrice - sWeight * pBuyRate).toFixed(2)) : 0;

      return {
        id: r.id,
        product_id: r.product_id,
        productName: r.product?.name || "অজানা পণ্য",
        productSubtitle: r.product?.subtitle || null,
        date: r.date,
        kroyweight: bWeight,
        kroyprice: bPrice,
        dailysaleweight: sWeight,
        dailysaleprice: sPrice,
        sellRate: sRate,
        buyRate: bRate,
        profit: pProfit,
        amount: sPrice,
        paid_amount: sPrice,
        due_amount: 0,
        description: `বিক্রয়: ${sWeight} kg @ ৳${sRate}/kg | ক্রয়: ${bWeight} kg`,
        customer: {
          id: r.product_id,
          name: r.product?.name || "-",
          phone: r.product?.subtitle || null,
        },
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });

    return {
      metrics: {
        totalSales,
        totalSaleWeight,
        totalPurchaseCost,
        totalPurchaseWeight,
        totalCollected: totalSales,
        totalDue: 0,
        netTurnover: totalSales,
        collectionRate: 100,
        totalTransactions: total,
        avgSaleAmount,
        avgSellRate,
        avgBuyRate,
        simpleProfit,
        otherCosts,
        netProfit,
        totalProductSaleWeight: totalSaleWeight,
        totalProductSalePrice: totalSales,
      },
      transactions,
      productsSummary,
      topProductsBySales,
      topProductsByProfit,
      topCustomersBySales,
      topCustomersByDue,
      total,
      totalPages,
      currentPage: page,
      limit,
      dailyTrend,
    };
  } catch (error) {
    console.error("Error in getCentralSalesReportData:", error);
    return {
      metrics: {
        totalSales: 0,
        totalSaleWeight: 0,
        totalPurchaseCost: 0,
        totalPurchaseWeight: 0,
        totalCollected: 0,
        totalDue: 0,
        netTurnover: 0,
        collectionRate: 0,
        totalTransactions: 0,
        avgSaleAmount: 0,
        avgSellRate: 0,
        avgBuyRate: 0,
        simpleProfit: 0,
        otherCosts: 0,
        netProfit: 0,
      },
      transactions: [],
      productsSummary: [],
      topProductsBySales: [],
      topProductsByProfit: [],
      topCustomersBySales: [],
      topCustomersByDue: [],
      total: 0,
      totalPages: 1,
      currentPage: 1,
      limit: options.limit || 25,
      dailyTrend: [],
    };
  }
}
