import { CustomerType, PrismaClient, TransactionType } from "@prisma/client";
import * as dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import * as path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const prisma = new PrismaClient();

// Legacy MongoDB connection URI
const LEGACY_MONGODB_URI =
  process.env.LEGACY_MONGODB_URI ||
  "mongodb+srv://srkhaddoDB:vzVY4ZkZjfe72YPn@cluster0.vefjkrb.mongodb.net/?appName=Cluster0";

// Command-line flags
const isDryRun = process.argv.includes("--dry-run");
const cleanDummies = process.argv.includes("--clean-dummies");

/**
 * Sanitize and validate phone numbers
 * Returns null for placeholders like "00", "0", "000", "null", or empty strings
 */
function sanitizePhone(phoneRaw?: string | null): string | null {
  if (!phoneRaw) return null;
  const trimmed = phoneRaw.trim();
  if (
    trimmed === "" ||
    trimmed === "0" ||
    trimmed === "00" ||
    trimmed === "000" ||
    trimmed === "0000" ||
    trimmed === "null" ||
    trimmed === "undefined"
  ) {
    return null;
  }
  // Remove non-digit characters except leading +
  const cleaned = trimmed.replace(/[^\d+]/g, "");
  if (cleaned.length < 5) return null;
  return cleaned;
}

/**
 * Sanitize and normalize image URLs to prevent invalid protocol crashes in Next.js Image component.
 */
function sanitizeImageUrl(url?: string | null): string | null {
  if (!url) return null;
  let clean = url.trim();
  if (!clean) return null;

  // Fix common protocol typos
  clean = clean.replace(/^hhttps:\/\//i, "https://");
  clean = clean.replace(/^ttps:\/\//i, "https://");
  clean = clean.replace(/^http:\/\//i, "https://");
  clean = clean.replace(/^https\/\//i, "https://");
  clean = clean.replace(/^http\/\//i, "https://");

  if (clean.startsWith("//")) {
    clean = `https:${clean}`;
  }

  if (clean.startsWith("/") || clean.startsWith("http://") || clean.startsWith("https://")) {
    return clean;
  }

  return null;
}

/**
 * Parse price string or number to float
 */
function parsePrice(priceRaw: string | number | undefined | null): number {
  if (priceRaw === undefined || priceRaw === null) return 0;
  if (typeof priceRaw === "number") return Math.max(0, priceRaw);
  const match = priceRaw.replace(/,/g, "").match(/[\d.]+/);
  return match ? parseFloat(match[0]) : 0;
}

/**
 * Ensure MongoDB indexes on Customer collection are partial unique
 */
async function ensureSparseIndexes() {
  try {
    try {
      await prisma.$runCommandRaw({ dropIndexes: "customers", index: "customers_email_key" });
    } catch {
      // ignore
    }
    try {
      await prisma.$runCommandRaw({ dropIndexes: "customers", index: "customers_phone_key" });
    } catch {
      // ignore
    }

    await prisma.$runCommandRaw({
      createIndexes: "customers",
      indexes: [
        {
          key: { email: 1 },
          name: "customers_email_key",
          unique: true,
          partialFilterExpression: { email: { $type: "string" } },
        },
        {
          key: { phone: 1 },
          name: "customers_phone_key",
          unique: true,
          partialFilterExpression: { phone: { $type: "string" } },
        },
      ],
    });
    console.log("✅ Configured partial unique indexes on customers collection.");
  } catch (error) {
    console.warn("⚠️ Warning during index setup:", error);
  }
}

interface LegacyClientTransaction {
  _id?: string;
  date?: string;
  kroy?: number | string;
  joma?: number | string;
  baki?: number | string;
  description?: string;
  biboron?: string;
}

interface LegacyClient {
  _id: ObjectId | string;
  name: string;
  location?: string | null;
  number?: string | null;
  transactions?: LegacyClientTransaction[];
}

interface LegacyPartyTransaction {
  _id?: string;
  date?: string;
  kroy?: number | string;
  joma?: number | string;
  biboron?: string;
  description?: string;
}

interface LegacyParty {
  _id: ObjectId | string;
  name: string;
  location?: string | null;
  number?: string | null;
  transactions?: LegacyPartyTransaction[];
}

interface LegacyProduct {
  _id: ObjectId | string;
  id?: number;
  name: string;
  pricePerKg?: number | string;
  transactions?: Array<{
    _id?: string;
    date?: string;
    kroyweight?: number;
    kroyprice?: number;
    dailysaleweight?: number;
    dailysaleprice?: number;
  }>;
}

interface LegacyFixedProduct {
  _id: ObjectId | string;
  name: string;
  subtitle?: string;
  price?: string | number;
  image?: string;
  badge?: string;
}

interface LegacyDokanTransaction {
  _id: ObjectId | string;
  date?: string;
  motKroy?: number | string;
  cashJoma?: number | string;
  pawna?: number | string;
  description?: string;
}

interface LegacyDailyTransaction {
  _id: ObjectId | string;
  date?: string;
  bikri?: number;
  uttholon?: number;
  baki?: number;
  bitoron?: number;
  bitoronDes?: string;
  khoroch?: number;
  createdAt?: Date | string;
}

async function sync() {
  console.log("==================================================");
  console.log("🔄 SR TradeLink — Legacy Data Sync & Migration");
  console.log("==================================================");
  if (isDryRun) {
    console.log("🔍 Running in DRY-RUN mode. No writes will be made.");
  }

  // 1. Connect to Legacy MongoDB
  console.log("\n📡 Connecting to legacy MongoDB cluster...");
  const legacyClient = new MongoClient(LEGACY_MONGODB_URI);
  await legacyClient.connect();
  console.log("✅ Connected to legacy MongoDB!");

  if (!isDryRun) {
    await ensureSparseIndexes();
  }

  // Handle dummy seed data cleanup if flag is passed
  if (cleanDummies && !isDryRun) {
    console.log("\n🧹 Cleaning dummy seed customer records...");
    const dummyEmails = [
      "rahim.dairy@example.com",
      "alamgir.feed@example.com",
      "greendairy@example.com",
      "abdullah.farm@example.com",
      "sonali.farm@example.com",
    ];
    for (const email of dummyEmails) {
      const dummy = await prisma.customer.findUnique({ where: { email } });
      if (dummy) {
        await prisma.transaction.deleteMany({ where: { customer_id: dummy.id } });
        await prisma.customer.delete({ where: { id: dummy.id } });
        console.log(`  - Removed dummy customer: ${dummy.name} (${email})`);
      }
    }
  }

  // ----------------------------------------------------
  // SYNC PRODUCTS (Fixed Products + ProductsDB)
  // ----------------------------------------------------
  console.log("\n📦 [1/5] Syncing Products...");
  const fixedProds = (await legacyClient
    .db("homeproducts")
    .collection("fixedproducts")
    .find()
    .toArray()) as unknown as LegacyFixedProduct[];

  const customProds = (await legacyClient
    .db("productsdb")
    .collection("products")
    .find()
    .toArray()) as unknown as LegacyProduct[];

  let productsSynced = 0;

  // 1a. Sync Fixed Products
  for (const fp of fixedProds) {
    const id = fp._id.toString();
    const priceNum = parsePrice(fp.price);
    const cleanImg = sanitizeImageUrl(fp.image);

    const data = {
      name: fp.name.trim(),
      subtitle: fp.subtitle?.trim() || null,
      stock: 50,
      price: priceNum,
      description: `${fp.name}${fp.subtitle ? ` - ${fp.subtitle}` : ""}। উচ্চমানের প্রিমিয়াম গবাদি পশু খাদ্য।`,
      image: cleanImg,
      badge: fp.badge || "",
      unit: "KG" as const,
    };

    if (!isDryRun) {
      await prisma.product.upsert({
        where: { id },
        update: data,
        create: {
          id,
          ...data,
        },
      });
    }
    productsSynced++;
  }

  // 1b. Sync Custom ProductsDB (e.g., Medicine, Putin, DRB)
  for (const cp of customProds) {
    const name = cp.name.trim();
    const price = parsePrice(cp.pricePerKg);
    const existing = isDryRun
      ? null
      : await prisma.product.findFirst({
          where: { name: { equals: name, mode: "insensitive" } },
        });

    if (!existing) {
      const id = cp._id.toString();
      if (!isDryRun) {
        await prisma.product.upsert({
          where: { id },
          update: {
            name,
            price,
            stock: 50,
            unit: "KG",
            description: `${name}। উচ্চমানের গবাদি পশু খাদ্য ও ঔষধ।`,
          },
          create: {
            id,
            name,
            price,
            stock: 50,
            unit: "KG",
            description: `${name}। উচ্চমানের গবাদি পশু খাদ্য ও ঔষধ।`,
          },
        });
      }
      productsSynced++;
    }
  }
  console.log(`✅ Products processed: ${productsSynced}`);

  // ----------------------------------------------------
  // SYNC CLIENTS & THEIR TRANSACTIONS
  // ----------------------------------------------------
  console.log("\n👥 [2/5] Syncing Clients (Retail Customers) & Transactions...");
  const clients = (await legacyClient
    .db("clientsdb")
    .collection("clients")
    .find()
    .toArray()) as unknown as LegacyClient[];

  let clientsCount = 0;
  let clientTxCount = 0;
  const usedPhoneNumbers = new Set<string>();

  // Collect existing phone numbers in DB to avoid collisions
  const existingCustomers = await prisma.customer.findMany({
    select: { id: true, phone: true },
  });
  for (const ec of existingCustomers) {
    if (ec.phone) usedPhoneNumbers.add(ec.phone);
  }

  for (const client of clients) {
    const custId = client._id.toString();
    const rawPhone = sanitizePhone(client.number);
    let finalPhone: string | null = null;

    if (rawPhone) {
      if (
        !usedPhoneNumbers.has(rawPhone) ||
        existingCustomers.some((ec) => ec.id === custId && ec.phone === rawPhone)
      ) {
        finalPhone = rawPhone;
        usedPhoneNumbers.add(rawPhone);
      } else {
        console.warn(
          `⚠️ Duplicate phone "${rawPhone}" for client "${client.name}" (${custId}). Skipping phone assignment to preserve uniqueness.`
        );
      }
    }

    const customerData = {
      name: client.name.trim(),
      phone: finalPhone,
      address: client.location?.trim() || null,
      type: "RETAIL" as CustomerType,
      is_vip: false,
    };

    if (!isDryRun) {
      await prisma.customer.upsert({
        where: { id: custId },
        update: customerData,
        create: {
          id: custId,
          ...customerData,
        },
      });

      // Clear existing transactions for this customer to ensure clean, non-duplicated sync
      await prisma.transaction.deleteMany({
        where: { customer_id: custId },
      });
    }
    clientsCount++;

    // Sync client transactions
    if (client.transactions && Array.isArray(client.transactions)) {
      for (let idx = 0; idx < client.transactions.length; idx++) {
        const tx = client.transactions[idx];
        const kroy = Math.max(0, Number(tx.kroy) || 0);
        const joma = Math.max(0, Number(tx.joma) || 0);
        const baki = Math.max(0, Number(tx.baki) || 0);
        const desc = (tx.description || tx.biboron || "").trim() || null;
        const txDate = tx.date ? new Date(tx.date) : new Date();

        let type: TransactionType = "SALE";
        let amount = kroy;
        let paid_amount = joma;
        let due_amount = baki > 0 ? baki : Math.max(0, kroy - joma);

        if (kroy > 0) {
          type = "SALE";
          amount = kroy;
          paid_amount = joma;
          due_amount = baki > 0 ? baki : Math.max(0, kroy - joma);
        } else if (joma > 0) {
          type = "PAYMENT";
          amount = joma;
          paid_amount = joma;
          due_amount = 0;
        } else if (baki > 0) {
          type = "DUE";
          amount = baki;
          paid_amount = 0;
          due_amount = baki;
        }

        if (!isDryRun) {
          await prisma.transaction.create({
            data: {
              customer_id: custId,
              type,
              amount,
              paid_amount,
              due_amount,
              description: desc,
              reference: null,
              date: isNaN(txDate.getTime()) ? new Date() : txDate,
            },
          });
        }
        clientTxCount++;
      }
    }
  }
  console.log(`✅ Clients synced: ${clientsCount}, Client Transactions: ${clientTxCount}`);

  // ----------------------------------------------------
  // SYNC PARTYS & THEIR TRANSACTIONS
  // ----------------------------------------------------
  console.log("\n🏢 [3/5] Syncing Partys (Wholesale Accounts) & Transactions...");
  const partys = (await legacyClient
    .db("partysdb")
    .collection("partys")
    .find()
    .toArray()) as unknown as LegacyParty[];

  let partyCount = 0;
  let partyTxCount = 0;

  for (const party of partys) {
    const partyId = party._id.toString();
    const rawPhone = sanitizePhone(party.number);
    let finalPhone: string | null = null;

    if (rawPhone) {
      if (
        !usedPhoneNumbers.has(rawPhone) ||
        existingCustomers.some((ec) => ec.id === partyId && ec.phone === rawPhone)
      ) {
        finalPhone = rawPhone;
        usedPhoneNumbers.add(rawPhone);
      }
    }

    const partyData = {
      name: party.name.trim(),
      phone: finalPhone,
      address: party.location?.trim() || null,
      type: "WHOLESALE" as CustomerType,
      is_vip: true,
    };

    if (!isDryRun) {
      await prisma.customer.upsert({
        where: { id: partyId },
        update: partyData,
        create: {
          id: partyId,
          ...partyData,
        },
      });

      // Clear existing transactions for this party
      await prisma.transaction.deleteMany({
        where: { customer_id: partyId },
      });
    }
    partyCount++;

    if (party.transactions && Array.isArray(party.transactions)) {
      for (let idx = 0; idx < party.transactions.length; idx++) {
        const tx = party.transactions[idx];
        const kroy = Math.max(0, Number(tx.kroy) || 0);
        const joma = Math.max(0, Number(tx.joma) || 0);
        const desc = (tx.biboron || tx.description || "").trim() || null;
        const txDate = tx.date ? new Date(tx.date) : new Date();

        let type: TransactionType = "SALE";
        let amount = kroy;
        let paid_amount = joma;
        let due_amount = Math.max(0, kroy - joma);

        if (kroy > 0) {
          type = "SALE";
          amount = kroy;
          paid_amount = joma;
          due_amount = Math.max(0, kroy - joma);
        } else if (joma > 0) {
          type = "PAYMENT";
          amount = joma;
          paid_amount = joma;
          due_amount = 0;
        }

        if (!isDryRun) {
          await prisma.transaction.create({
            data: {
              customer_id: partyId,
              type,
              amount,
              paid_amount,
              due_amount,
              description: desc,
              reference: null,
              date: isNaN(txDate.getTime()) ? new Date() : txDate,
            },
          });
        }
        partyTxCount++;
      }
    }
  }
  console.log(`✅ Partys synced: ${partyCount}, Party Transactions: ${partyTxCount}`);

  // ----------------------------------------------------
  // SYNC DOKAN TRANSACTIONS (Shop Purchases & Expenses)
  // ----------------------------------------------------
  console.log("\n🏪 [4/5] Syncing Dokan Transactions (Shop Supplier & Purchases)...");
  const dokanTxs = (await legacyClient
    .db("dokantransactiondb")
    .collection("dokantransaction")
    .find()
    .toArray()) as unknown as LegacyDokanTransaction[];

  let dokanTxSynced = 0;
  if (dokanTxs.length > 0) {
    const dokanAccountId = "6a0000000000000000d00001";
    const dokanAccountData = {
      name: "দোকান ক্রয় ও সরবরাহকারী হিসাব (Shop & Suppliers)",
      address: "ঝাড়বাড়ী বাজার, প্রধান কার্যালয়",
      type: "WHOLESALE" as CustomerType,
      is_vip: true,
    };

    if (!isDryRun) {
      await prisma.customer.upsert({
        where: { id: dokanAccountId },
        update: dokanAccountData,
        create: {
          id: dokanAccountId,
          ...dokanAccountData,
        },
      });

      await prisma.transaction.deleteMany({
        where: { customer_id: dokanAccountId },
      });
    }

    for (const dtx of dokanTxs) {
      const motKroy = Math.max(0, Number(dtx.motKroy) || 0);
      const cashJoma = Math.max(0, Number(dtx.cashJoma) || 0);
      const pawna = Math.max(0, Number(dtx.pawna) || Math.max(0, motKroy - cashJoma));
      const desc = dtx.description?.trim() || "দোকান লেনদেন ও মালামাল ক্রয়";
      const txDate = dtx.date ? new Date(dtx.date) : new Date();

      let type: TransactionType = "SALE";
      let amount = motKroy;
      let paid_amount = cashJoma;
      let due_amount = pawna;

      if (motKroy === 0 && cashJoma > 0) {
        type = "PAYMENT";
        amount = cashJoma;
        paid_amount = cashJoma;
        due_amount = 0;
      }

      if (!isDryRun) {
        await prisma.transaction.create({
          data: {
            customer_id: dokanAccountId,
            type,
            amount,
            paid_amount,
            due_amount,
            description: desc,
            reference: null,
            date: isNaN(txDate.getTime()) ? new Date() : txDate,
          },
        });
      }
      dokanTxSynced++;
    }
  }
  console.log(`✅ Dokan Transactions synced: ${dokanTxSynced}`);

  // ----------------------------------------------------
  // SYNC DAILY TRANSACTIONS (Daily Cash & Expense Ledger)
  // ----------------------------------------------------
  console.log("\n📅 [5/5] Syncing Daily Transactions Ledger...");
  const dailyTxs = (await legacyClient
    .db("dailytransactiondb")
    .collection("dailytransaction")
    .find()
    .toArray()) as unknown as LegacyDailyTransaction[];

  let dailyTxSynced = 0;
  if (dailyTxs.length > 0) {
    const dailyAccountId = "6a0000000000000000d00002";
    const dailyAccountData = {
      name: "দৈনিক ক্যাশ ও বিতরণ হিসাব (Daily Ledger Account)",
      address: "ঝাড়বাড়ী বাজার",
      type: "BOTH" as CustomerType,
      is_vip: false,
    };

    if (!isDryRun) {
      await prisma.customer.upsert({
        where: { id: dailyAccountId },
        update: dailyAccountData,
        create: {
          id: dailyAccountId,
          ...dailyAccountData,
        },
      });

      await prisma.transaction.deleteMany({
        where: { customer_id: dailyAccountId },
      });
    }

    for (const dtx of dailyTxs) {
      const bikri = Math.max(0, Number(dtx.bikri) || 0);
      const baki = Math.max(0, Number(dtx.baki) || 0);
      const paid = Math.max(0, bikri - baki);
      const notes = [
        dtx.bitoron ? `বিতরণ: ৳${dtx.bitoron}${dtx.bitoronDes ? ` (${dtx.bitoronDes})` : ""}` : "",
        dtx.khoroch ? `খরচ: ৳${dtx.khoroch}` : "",
        dtx.uttholon ? `উত্তোলন: ৳${dtx.uttholon}` : "",
      ]
        .filter(Boolean)
        .join(", ");

      const txDate = dtx.date ? new Date(dtx.date) : new Date(dtx.createdAt || Date.now());

      if (!isDryRun) {
        await prisma.transaction.create({
          data: {
            customer_id: dailyAccountId,
            type: "SALE",
            amount: bikri,
            paid_amount: paid,
            due_amount: baki,
            description: notes || "দৈনিক সারসংক্ষেপ লেনদেন",
            reference: null,
            date: isNaN(txDate.getTime()) ? new Date() : txDate,
          },
        });
      }
      dailyTxSynced++;
    }
  }
  console.log(`✅ Daily Transactions synced: ${dailyTxSynced}`);

  // Summary
  console.log("\n==================================================");
  console.log("🎉 Migration & Sync Completed Successfully!");
  console.log("==================================================");
  console.log(`📊 Summary of Synced Entities:`);
  console.log(`  - Products:            ${productsSynced}`);
  console.log(`  - Retail Customers:    ${clientsCount}`);
  console.log(`  - Client Transactions: ${clientTxCount}`);
  console.log(`  - Wholesale Partys:    ${partyCount}`);
  console.log(`  - Party Transactions:  ${partyTxCount}`);
  console.log(`  - Dokan Transactions:  ${dokanTxSynced}`);
  console.log(`  - Daily Transactions:  ${dailyTxSynced}`);
  console.log(
    `  - Total Transactions:  ${clientTxCount + partyTxCount + dokanTxSynced + dailyTxSynced}`
  );
  console.log("==================================================\n");

  await legacyClient.close();
}

sync()
  .catch((err) => {
    console.error("❌ Sync failed with error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
