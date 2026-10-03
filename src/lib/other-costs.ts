import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

export interface OtherCost {
  id: string;
  title: string;
  category?: string | null;
  amount: number;
  date: Date | string;
  voucher_no?: string | null;
  description?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface OtherCostInput {
  title: string;
  category?: string | null;
  amount: number;
  date?: Date | string;
  voucher_no?: string | null;
  description?: string | null;
}

export interface GetOtherCostsOptions {
  search?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  skip?: number;
}

export interface CategorySummary {
  category: string;
  label: string;
  amount: number;
  count: number;
}

export interface OtherCostStats {
  totalAmount: number;
  totalCount: number;
  thisMonthAmount: number;
  todayAmount: number;
  categoryBreakdown?: CategorySummary[];
}

export interface PaginatedOtherCostsResult {
  otherCosts: OtherCost[];
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  stats: OtherCostStats;
}

export const OTHER_COST_CATEGORIES: { id: string; label: string; color: string }[] = [
  { id: "all", label: "সকল ক্যাটাগরি", color: "bg-slate-100 text-slate-700" },
  {
    id: "transport",
    label: "পরিবহন ও খালাস",
    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300",
  },
  {
    id: "salary",
    label: "কর্মচারী বেতন / হাজিরা",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300",
  },
  {
    id: "rent",
    label: "দোকান / গোডাউন ভাড়া",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300",
  },
  {
    id: "utility",
    label: "বিদ্যুৎ / ইউটিলিটি বিল",
    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-950/60 dark:text-yellow-300",
  },
  {
    id: "entertainment",
    label: "আপ্যায়ন / নাস্তা",
    color: "bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300",
  },
  {
    id: "maintenance",
    label: "মেরামত ও সার্ভিসিং",
    color: "bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300",
  },
  {
    id: "office",
    label: "অফিস ও স্টেশনারি",
    color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/60 dark:text-cyan-300",
  },
  {
    id: "packaging",
    label: "প্যাকিং ও লোডিং",
    color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300",
  },
  {
    id: "fuel",
    label: "জ্বালানি / তেল",
    color: "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300",
  },
  {
    id: "other",
    label: "অন্যান্য বিবিধ খরচ",
    color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
  },
];

export function getCategoryLabel(categoryKey?: string | null): string {
  if (!categoryKey) return "অন্যান্য বিবিধ খরচ";
  const found = OTHER_COST_CATEGORIES.find((c) => c.id === categoryKey);
  return found ? found.label : categoryKey;
}

export function getCategoryBadgeClass(categoryKey?: string | null): string {
  if (!categoryKey) return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
  const found = OTHER_COST_CATEGORIES.find((c) => c.id === categoryKey);
  return found ? found.color : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
}

function buildWhereClause(options: GetOtherCostsOptions): Prisma.OtherCostWhereInput {
  const { search, category, startDate, endDate } = options;
  const andConditions: Prisma.OtherCostWhereInput[] = [];

  if (search && search.trim() !== "") {
    const term = search.trim();
    andConditions.push({
      OR: [
        { title: { contains: term, mode: "insensitive" } },
        { description: { contains: term, mode: "insensitive" } },
        { category: { contains: term, mode: "insensitive" } },
      ],
    });
  }

  if (category && category !== "all") {
    andConditions.push({
      category: category,
    });
  }

  if (startDate || endDate) {
    const dateCondition: Prisma.DateTimeFilter = {};
    if (startDate) {
      const s = new Date(startDate);
      s.setHours(0, 0, 0, 0);
      dateCondition.gte = s;
    }
    if (endDate) {
      const e = new Date(endDate);
      e.setHours(23, 59, 59, 999);
      dateCondition.lte = e;
    }
    andConditions.push({ date: dateCondition });
  }

  return andConditions.length > 0 ? { AND: andConditions } : {};
}

/**
 * Fetch stats for other costs (total amount, this month, today, count, breakdown)
 */
export async function getOtherCostStats(
  options: {
    category?: string;
    startDate?: string;
    endDate?: string;
  } = {}
): Promise<OtherCostStats> {
  const where = buildWhereClause(options);

  // All matching records
  const allMatching = await prisma.otherCost.findMany({
    where,
    select: {
      amount: true,
      category: true,
      date: true,
    },
  });

  const now = new Date();
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let totalAmount = 0;
  let thisMonthAmount = 0;
  let todayAmount = 0;

  const categoryMap = new Map<string, { amount: number; count: number }>();

  for (const item of allMatching) {
    const amt = Number(item.amount) || 0;
    totalAmount += amt;

    const itemDate = new Date(item.date);
    if (itemDate >= currentMonthStart) {
      thisMonthAmount += amt;
    }
    if (itemDate >= todayStart) {
      todayAmount += amt;
    }

    const cat = item.category || "other";
    const cur = categoryMap.get(cat) || { amount: 0, count: 0 };
    cur.amount += amt;
    cur.count += 1;
    categoryMap.set(cat, cur);
  }

  const categoryBreakdown: CategorySummary[] = Array.from(categoryMap.entries()).map(
    ([cat, data]) => ({
      category: cat,
      label: getCategoryLabel(cat),
      amount: data.amount,
      count: data.count,
    })
  );

  return {
    totalAmount,
    totalCount: allMatching.length,
    thisMonthAmount,
    todayAmount,
    categoryBreakdown,
  };
}

/**
 * Get paginated other costs list with search, category and date filters
 */
export async function getPaginatedOtherCosts(
  options: GetOtherCostsOptions = {}
): Promise<PaginatedOtherCostsResult> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 20));
  const skip = options.skip !== undefined ? options.skip : (page - 1) * limit;

  const where = buildWhereClause(options);

  const [total, records, stats] = await Promise.all([
    prisma.otherCost.count({ where }),
    prisma.otherCost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { date: "desc" },
    }),
    getOtherCostStats({
      category: options.category,
      startDate: options.startDate,
      endDate: options.endDate,
    }),
  ]);

  const otherCosts: OtherCost[] = records.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    amount: Number(r.amount) || 0,
    date: r.date,
    voucher_no: r.voucher_no,
    description: r.description,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return {
    otherCosts,
    total,
    totalPages,
    currentPage: page,
    limit,
    stats,
  };
}

/**
 * Get all other costs without pagination (used for full report/exports)
 */
export async function getAllOtherCosts(options: GetOtherCostsOptions = {}): Promise<OtherCost[]> {
  const where = buildWhereClause(options);

  const records = await prisma.otherCost.findMany({
    where,
    orderBy: { date: "desc" },
    take: 10000,
  });

  return records.map((r) => ({
    id: r.id,
    title: r.title,
    category: r.category,
    amount: Number(r.amount) || 0,
    date: r.date,
    voucher_no: r.voucher_no,
    description: r.description,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

/**
 * Get single other cost by ID
 */
export async function getOtherCostById(id: string): Promise<OtherCost | null> {
  const r = await prisma.otherCost.findUnique({
    where: { id },
  });
  if (!r) return null;

  return {
    id: r.id,
    title: r.title,
    category: r.category,
    amount: Number(r.amount) || 0,
    date: r.date,
    voucher_no: r.voucher_no,
    description: r.description,
    created_at: r.created_at,
    updated_at: r.updated_at,
  };
}

/**
 * Create a new other cost entry
 */
export async function createOtherCost(input: OtherCostInput): Promise<OtherCost> {
  if (!input.title || input.title.trim() === "") {
    throw new Error("খরচের শিরোনাম / বিবরণ আবশ্যক");
  }

  const amount = Number(input.amount);
  if (isNaN(amount) || amount < 0) {
    throw new Error("খরচের পরিমাণ সঠিক সংখ্যা হতে হবে");
  }

  const date = input.date ? new Date(input.date) : new Date();

  const created = await prisma.otherCost.create({
    data: {
      title: input.title.trim(),
      category: input.category?.trim() || "other",
      amount,
      date,
      voucher_no: input.voucher_no?.trim() || null,
      description: input.description?.trim() || null,
    },
  });

  return {
    id: created.id,
    title: created.title,
    category: created.category,
    amount: Number(created.amount) || 0,
    date: created.date,
    voucher_no: created.voucher_no,
    description: created.description,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}

/**
 * Update an existing other cost entry
 */
export async function updateOtherCost(
  id: string,
  input: Partial<OtherCostInput>
): Promise<OtherCost> {
  const existing = await prisma.otherCost.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("খরচের এন্ট্রিটি খুঁজে পাওয়া যায়নি");
  }

  const updateData: Prisma.OtherCostUpdateInput = {};

  if (input.title !== undefined) {
    if (!input.title || input.title.trim() === "") {
      throw new Error("খরচের শিরোনাম / বিবরণ আবশ্যক");
    }
    updateData.title = input.title.trim();
  }

  if (input.category !== undefined) {
    updateData.category = input.category?.trim() || "other";
  }

  if (input.amount !== undefined) {
    const amount = Number(input.amount);
    if (isNaN(amount) || amount < 0) {
      throw new Error("খরচের পরিমাণ সঠিক সংখ্যা হতে হবে");
    }
    updateData.amount = amount;
  }

  if (input.date !== undefined) {
    updateData.date = input.date ? new Date(input.date) : new Date();
  }

  if (input.voucher_no !== undefined) {
    updateData.voucher_no = input.voucher_no?.trim() || null;
  }

  if (input.description !== undefined) {
    updateData.description = input.description?.trim() || null;
  }

  const updated = await prisma.otherCost.update({
    where: { id },
    data: updateData,
  });

  return {
    id: updated.id,
    title: updated.title,
    category: updated.category,
    amount: Number(updated.amount) || 0,
    date: updated.date,
    voucher_no: updated.voucher_no,
    description: updated.description,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

/**
 * Delete an other cost entry
 */
export async function deleteOtherCost(id: string): Promise<boolean> {
  const existing = await prisma.otherCost.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("খরচের এন্ট্রিটি খুঁজে পাওয়া যায়নি");
  }

  await prisma.otherCost.delete({ where: { id } });
  return true;
}
