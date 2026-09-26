import { prisma } from "@/lib/prisma";

export interface Party {
  id: string;
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
  totalKroy?: number;
  totalJoma?: number;
  totalPawna?: number;
  transactionCount?: number;
}

export interface PartyInput {
  name: string;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
}

export interface PartyTransaction {
  id: string;
  party_id: string;
  date: Date | string;
  kroy: number;
  joma: number;
  description?: string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface PartyTransactionInput {
  party_id: string;
  date?: Date | string;
  kroy?: number;
  joma?: number;
  description?: string | null;
}

export interface PartyTransactionSummary {
  partyId: string;
  totalKroy: number;
  totalJoma: number;
  totalPawna: number;
  totalTransactions: number;
  lastTransactionDate?: Date | string | null;
}

export interface GetPartiesOptions {
  search?: string;
  limit?: number;
  skip?: number;
}

export interface GetPartyTransactionsOptions {
  search?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  skip?: number;
}

export interface PartyLedgerEntry extends PartyTransaction {
  runningBalance: number;
}

export interface PartyStatementLedgerData {
  openingBalance: number;
  entries: PartyLedgerEntry[];
  totalPeriodKroy: number;
  totalPeriodJoma: number;
  netPeriodChange: number;
  closingBalance: number;
  transactionCount: number;
  startDate?: string;
  endDate?: string;
}

let partyIndexesEnsured = false;

/**
 * Ensure MongoDB indexes on parties collection are partial unique
 * so multiple parties with null phone numbers can coexist without collision.
 */
export async function ensurePartySparseIndexes(): Promise<void> {
  if (partyIndexesEnsured) return;
  try {
    try {
      await prisma.$runCommandRaw({ dropIndexes: "parties", index: "parties_phone_key" });
    } catch {
      // ignore if does not exist
    }

    await prisma.$runCommandRaw({
      createIndexes: "parties",
      indexes: [
        {
          key: { phone: 1 },
          name: "parties_phone_key",
          unique: true,
          partialFilterExpression: { phone: { $type: "string" } },
        },
      ],
    });

    partyIndexesEnsured = true;
  } catch (error) {
    console.warn("Could not configure partial indexes on parties collection:", error);
  }
}

/**
 * Fetch parties with optional search filtering and pre-calculated transaction totals
 */
export async function getParties(options: GetPartiesOptions = {}): Promise<Party[]> {
  try {
    await ensurePartySparseIndexes();

    const whereClause: {
      OR?: Array<{
        name?: { contains: string; mode: "insensitive" };
        phone?: { contains: string; mode: "insensitive" };
        address?: { contains: string; mode: "insensitive" };
        notes?: { contains: string; mode: "insensitive" };
      }>;
    } = {};

    if (options.search?.trim()) {
      const term = options.search.trim();
      whereClause.OR = [
        { name: { contains: term, mode: "insensitive" as const } },
        { phone: { contains: term, mode: "insensitive" as const } },
        { address: { contains: term, mode: "insensitive" as const } },
        { notes: { contains: term, mode: "insensitive" as const } },
      ];
    }

    const parties = await prisma.party.findMany({
      where: whereClause,
      include: {
        transactions: {
          select: {
            kroy: true,
            joma: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: options.limit,
      skip: options.skip,
    });

    return parties.map((p) => {
      let totalKroy = 0;
      let totalJoma = 0;

      for (const t of p.transactions) {
        totalKroy += Number(t.kroy) || 0;
        totalJoma += Number(t.joma) || 0;
      }

      totalKroy = parseFloat(totalKroy.toFixed(2));
      totalJoma = parseFloat(totalJoma.toFixed(2));
      const totalPawna = parseFloat((totalKroy - totalJoma).toFixed(2));

      return {
        id: p.id,
        name: p.name,
        phone: p.phone,
        address: p.address,
        notes: p.notes,
        created_at: p.created_at,
        updated_at: p.updated_at,
        totalKroy,
        totalJoma,
        totalPawna,
        transactionCount: p.transactions.length,
      };
    });
  } catch (error) {
    console.error("Error fetching parties from database:", error);
    return [];
  }
}

/**
 * Fetch a single party by ID with computed transaction totals
 */
export async function getPartyById(id: string): Promise<Party | null> {
  try {
    const party = await prisma.party.findUnique({
      where: { id },
      include: {
        transactions: {
          select: {
            kroy: true,
            joma: true,
          },
        },
      },
    });

    if (!party) return null;

    let totalKroy = 0;
    let totalJoma = 0;

    for (const t of party.transactions) {
      totalKroy += Number(t.kroy) || 0;
      totalJoma += Number(t.joma) || 0;
    }

    totalKroy = parseFloat(totalKroy.toFixed(2));
    totalJoma = parseFloat(totalJoma.toFixed(2));
    const totalPawna = parseFloat((totalKroy - totalJoma).toFixed(2));

    return {
      id: party.id,
      name: party.name,
      phone: party.phone,
      address: party.address,
      notes: party.notes,
      created_at: party.created_at,
      updated_at: party.updated_at,
      totalKroy,
      totalJoma,
      totalPawna,
      transactionCount: party.transactions.length,
    };
  } catch (error) {
    console.error("Error fetching party by ID:", error);
    return null;
  }
}

/**
 * Create a new party
 */
export async function createParty(input: PartyInput): Promise<Party> {
  await ensurePartySparseIndexes();

  const { name, phone, address, notes } = input;

  if (!name?.trim()) {
    throw new Error("পার্টির নাম আবশ্যক");
  }

  const cleanPhone = phone?.trim() ? phone.trim() : null;
  const cleanAddress = address?.trim() ? address.trim() : null;
  const cleanNotes = notes?.trim() ? notes.trim() : null;

  if (cleanPhone) {
    const existingWithPhone = await prisma.party.findFirst({
      where: { phone: cleanPhone },
    });
    if (existingWithPhone) {
      throw new Error(
        `এই ফোন নম্বর (${cleanPhone}) ইতিমধ্যে অন্য একটি পার্টির জন্য ব্যবহৃত হয়েছে`
      );
    }
  }

  const newParty = await prisma.party.create({
    data: {
      name: name.trim(),
      phone: cleanPhone,
      address: cleanAddress,
      notes: cleanNotes,
    },
  });

  return {
    id: newParty.id,
    name: newParty.name,
    phone: newParty.phone,
    address: newParty.address,
    notes: newParty.notes,
    created_at: newParty.created_at,
    updated_at: newParty.updated_at,
    totalKroy: 0,
    totalJoma: 0,
    totalPawna: 0,
    transactionCount: 0,
  };
}

/**
 * Update an existing party
 */
export async function updateParty(id: string, input: Partial<PartyInput>): Promise<Party> {
  await ensurePartySparseIndexes();

  if (!id) {
    throw new Error("পার্টি আইডি আবশ্যক");
  }

  const existing = await prisma.party.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("পার্টি খুঁজে পাওয়া যায়নি");
  }

  const data: {
    name?: string;
    phone?: string | null;
    address?: string | null;
    notes?: string | null;
  } = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("পার্টির নাম খালি রাখা যাবে না");
    data.name = input.name.trim();
  }

  if (input.phone !== undefined) {
    const cleanPhone = input.phone?.trim() ? input.phone.trim() : null;
    if (cleanPhone && cleanPhone !== existing.phone) {
      const duplicate = await prisma.party.findFirst({
        where: { phone: cleanPhone, NOT: { id } },
      });
      if (duplicate) {
        throw new Error(`এই ফোন নম্বর (${cleanPhone}) ইতিমধ্যে অন্য পার্টির সাথে যুক্ত`);
      }
    }
    data.phone = cleanPhone;
  }

  if (input.address !== undefined) {
    data.address = input.address?.trim() ? input.address.trim() : null;
  }

  if (input.notes !== undefined) {
    data.notes = input.notes?.trim() ? input.notes.trim() : null;
  }

  const updated = await prisma.party.update({
    where: { id },
    data,
    include: {
      transactions: {
        select: {
          kroy: true,
          joma: true,
        },
      },
    },
  });

  let totalKroy = 0;
  let totalJoma = 0;

  for (const t of updated.transactions) {
    totalKroy += Number(t.kroy) || 0;
    totalJoma += Number(t.joma) || 0;
  }

  totalKroy = parseFloat(totalKroy.toFixed(2));
  totalJoma = parseFloat(totalJoma.toFixed(2));
  const totalPawna = parseFloat((totalKroy - totalJoma).toFixed(2));

  return {
    id: updated.id,
    name: updated.name,
    phone: updated.phone,
    address: updated.address,
    notes: updated.notes,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
    totalKroy,
    totalJoma,
    totalPawna,
    transactionCount: updated.transactions.length,
  };
}

/**
 * Delete a party by ID (cascades to all party transactions)
 */
export async function deleteParty(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("পার্টি আইডি আবশ্যক");
  }

  await prisma.party.delete({
    where: { id },
  });

  return true;
}

/**
 * Fetch transactions for a specific party with optional date and search filters
 */
export async function getPartyTransactions(
  partyId: string,
  options: GetPartyTransactionsOptions = {}
): Promise<{ transactions: PartyTransaction[]; total: number }> {
  try {
    const where: {
      party_id: string;
      date?: {
        gte?: Date;
        lte?: Date;
      };
      description?: {
        contains: string;
        mode: "insensitive";
      };
    } = {
      party_id: partyId,
    };

    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) {
        where.date.gte = new Date(`${options.startDate}T00:00:00.000Z`);
      }
      if (options.endDate) {
        where.date.lte = new Date(`${options.endDate}T23:59:59.999Z`);
      }
    }

    if (options.search?.trim()) {
      where.description = {
        contains: options.search.trim(),
        mode: "insensitive",
      };
    }

    const [transactions, total] = await Promise.all([
      prisma.partyTransaction.findMany({
        where,
        orderBy: [{ date: "desc" }, { created_at: "desc" }],
        take: options.limit,
        skip: options.skip,
      }),
      prisma.partyTransaction.count({ where }),
    ]);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        party_id: t.party_id,
        date: t.date,
        kroy: Number(t.kroy) || 0,
        joma: Number(t.joma) || 0,
        description: t.description,
        created_at: t.created_at,
        updated_at: t.updated_at,
      })),
      total,
    };
  } catch (error) {
    console.error("Error fetching party transactions:", error);
    return { transactions: [], total: 0 };
  }
}

/**
 * Fetch a single party transaction by ID
 */
export async function getPartyTransactionById(id: string): Promise<PartyTransaction | null> {
  try {
    const tx = await prisma.partyTransaction.findUnique({
      where: { id },
    });

    if (!tx) return null;

    return {
      id: tx.id,
      party_id: tx.party_id,
      date: tx.date,
      kroy: Number(tx.kroy) || 0,
      joma: Number(tx.joma) || 0,
      description: tx.description,
      created_at: tx.created_at,
      updated_at: tx.updated_at,
    };
  } catch (error) {
    console.error("Error fetching party transaction by ID:", error);
    return null;
  }
}

/**
 * Fetch party financial summary (total kroy, total joma, current pawna, tx count, last date)
 */
export async function getPartyTransactionSummary(
  partyId: string
): Promise<PartyTransactionSummary> {
  try {
    const transactions = await prisma.partyTransaction.findMany({
      where: { party_id: partyId },
      select: {
        kroy: true,
        joma: true,
        date: true,
      },
      orderBy: { date: "desc" },
    });

    let totalKroy = 0;
    let totalJoma = 0;

    for (const t of transactions) {
      totalKroy += Number(t.kroy) || 0;
      totalJoma += Number(t.joma) || 0;
    }

    totalKroy = parseFloat(totalKroy.toFixed(2));
    totalJoma = parseFloat(totalJoma.toFixed(2));
    const totalPawna = parseFloat((totalKroy - totalJoma).toFixed(2));

    return {
      partyId,
      totalKroy,
      totalJoma,
      totalPawna,
      totalTransactions: transactions.length,
      lastTransactionDate: transactions[0]?.date || null,
    };
  } catch (error) {
    console.error("Error computing party transaction summary:", error);
    return {
      partyId,
      totalKroy: 0,
      totalJoma: 0,
      totalPawna: 0,
      totalTransactions: 0,
      lastTransactionDate: null,
    };
  }
}

/**
 * Create a new party transaction
 */
export async function createPartyTransaction(
  input: PartyTransactionInput
): Promise<PartyTransaction> {
  const { party_id, date, kroy, joma, description } = input;

  if (!party_id) {
    throw new Error("পার্টি আইডি আবশ্যক");
  }

  const kroyVal = Math.max(0, Number(kroy) || 0);
  const jomaVal = Math.max(0, Number(joma) || 0);

  if (kroyVal === 0 && jomaVal === 0) {
    throw new Error("ক্রয় বা জমা এর মধ্যে অন্তত একটির পরিমাণ দিন");
  }

  let txDate = new Date();
  if (date) {
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      txDate = parsed;
    }
  }

  const created = await prisma.partyTransaction.create({
    data: {
      party_id,
      date: txDate,
      kroy: kroyVal,
      joma: jomaVal,
      description: description?.trim() || null,
    },
  });

  return {
    id: created.id,
    party_id: created.party_id,
    date: created.date,
    kroy: created.kroy,
    joma: created.joma,
    description: created.description,
    created_at: created.created_at,
    updated_at: created.updated_at,
  };
}

/**
 * Update an existing party transaction
 */
export async function updatePartyTransaction(
  id: string,
  input: Partial<PartyTransactionInput>
): Promise<PartyTransaction> {
  if (!id) {
    throw new Error("লেনদেন আইডি আবশ্যক");
  }

  const existing = await prisma.partyTransaction.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new Error("লেনদেন পাওয়া যায়নি");
  }

  const data: {
    date?: Date;
    kroy?: number;
    joma?: number;
    description?: string | null;
  } = {};

  if (input.date !== undefined) {
    const parsed = new Date(input.date);
    if (!isNaN(parsed.getTime())) {
      data.date = parsed;
    }
  }

  if (input.kroy !== undefined) {
    data.kroy = Math.max(0, Number(input.kroy) || 0);
  }

  if (input.joma !== undefined) {
    data.joma = Math.max(0, Number(input.joma) || 0);
  }

  if (input.description !== undefined) {
    data.description = input.description?.trim() || null;
  }

  const updated = await prisma.partyTransaction.update({
    where: { id },
    data,
  });

  return {
    id: updated.id,
    party_id: updated.party_id,
    date: updated.date,
    kroy: updated.kroy,
    joma: updated.joma,
    description: updated.description,
    created_at: updated.created_at,
    updated_at: updated.updated_at,
  };
}

/**
 * Delete a party transaction by ID
 */
export async function deletePartyTransaction(id: string): Promise<boolean> {
  if (!id) {
    throw new Error("লেনদেন আইডি আবশ্যক");
  }

  await prisma.partyTransaction.delete({
    where: { id },
  });

  return true;
}

/**
 * Calculate chronological statement ledger with opening balance, running balances, and period summary
 */
export function calculatePartyStatementLedger(
  allTransactions: PartyTransaction[],
  startDate?: string,
  endDate?: string
): PartyStatementLedgerData {
  // Sort chronologically ascending (oldest first)
  const sorted = [...allTransactions].sort((a, b) => {
    const dateA = new Date(a.date).getTime();
    const dateB = new Date(b.date).getTime();
    if (dateA !== dateB) return dateA - dateB;
    const createA = a.created_at ? new Date(a.created_at).getTime() : 0;
    const createB = b.created_at ? new Date(b.created_at).getTime() : 0;
    return createA - createB;
  });

  let openingBalance = 0;
  const inScopeTransactions: PartyTransaction[] = [];

  for (const tx of sorted) {
    const txDateStr = new Date(tx.date).toISOString().split("T")[0];
    const kroy = Number(tx.kroy) || 0;
    const joma = Number(tx.joma) || 0;
    const net = kroy - joma;

    if (startDate && txDateStr < startDate) {
      openingBalance += net;
    } else if (!endDate || txDateStr <= endDate) {
      inScopeTransactions.push(tx);
    }
  }

  openingBalance = parseFloat(openingBalance.toFixed(2));

  let runningBalance = openingBalance;
  let totalPeriodKroy = 0;
  let totalPeriodJoma = 0;

  const entries: PartyLedgerEntry[] = inScopeTransactions.map((tx) => {
    const kroy = Number(tx.kroy) || 0;
    const joma = Number(tx.joma) || 0;

    runningBalance = runningBalance + kroy - joma;
    totalPeriodKroy += kroy;
    totalPeriodJoma += joma;

    return {
      ...tx,
      kroy,
      joma,
      runningBalance: parseFloat(runningBalance.toFixed(2)),
    };
  });

  totalPeriodKroy = parseFloat(totalPeriodKroy.toFixed(2));
  totalPeriodJoma = parseFloat(totalPeriodJoma.toFixed(2));
  const netPeriodChange = parseFloat((totalPeriodKroy - totalPeriodJoma).toFixed(2));
  const closingBalance = parseFloat((openingBalance + netPeriodChange).toFixed(2));

  return {
    openingBalance,
    entries,
    totalPeriodKroy,
    totalPeriodJoma,
    netPeriodChange,
    closingBalance,
    transactionCount: entries.length,
    startDate,
    endDate,
  };
}
