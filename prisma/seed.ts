import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";



const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const adminPassword = process.env.SEED_ADMIN_PASSWORD || "Admin@123456";
  const hashedAdminPassword = await argon2.hash(adminPassword, {
    type: argon2.argon2id,
  });

  const adminEmail = (process.env.SEED_ADMIN_EMAIL || "admin@srtradelink.com").toLowerCase().trim();

  const adminUser = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "SR Tradelink Admin",
      password: hashedAdminPassword,
      role: "admin",
    },
    create: {
      email: adminEmail,
      name: "SR Tradelink Admin",
      password: hashedAdminPassword,
      role: "admin",
    },
  });

  console.log(`✅ Admin user seeded: ${adminUser.email} (Role: ${adminUser.role})`);

  // Products are fully dynamic, no hardcoded initial data.

  console.log("🌱 Checking customers...");
  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    console.log("🌱 Seeding initial customers...");
    const sampleCustomers = [
      {
        name: "রহিম ডেইরি ফার্ম",
        phone: "01711223344",
        address: "পাবনা সদর, পাবনা",


      },
      {
        name: "আলমগীর ক্যাটল ফিড",
        phone: "01811556677",
        address: "শাহজাদপুর, সিরাজগঞ্জ",


      },
      {
        name: "গ্রীন ডেইরি অ্যান্ড এগ্রো",
        phone: "01911889900",
        address: "শেরপুর, বগুড়া",


      },
      {
        name: "হাজী আব্দুল্লাহ খামার",
        phone: "01611334455",
        address: "সিংড়া, নাটোর",


      },
      {
        name: "সোনালী ফিশারিজ ও ডেইরি",
        phone: "01722446688",
        address: "মিঠাপুকুর, রংপুর",


      },
    ];

    for (const cust of sampleCustomers) {
      await prisma.customer.create({ data: cust });
    }
    console.log(`✅ ${sampleCustomers.length} initial customers seeded!`);
  } else {
    console.log(`ℹ️  Customers collection already has ${customerCount} records.`);
  }

  console.log("🌱 Checking parties...");
  const partyCount = await prisma.party.count();
  if (partyCount === 0) {
    console.log("🌱 Seeding initial parties...");
    const sampleParties = [
      {
        name: "মেসার্স সততা ট্রেডার্স",
        phone: "01715998877",
        address: "বীরগঞ্জ বাজার, দিনাজপুর",
        notes: "ফিড ও ভুষি পাইকারি মহাজন",
        transactions: {
          create: [
            {
              date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
              kroy: 50000,
              joma: 30000,
              description: "লেয়ার ফিড ৫০ বস্তা চালান",
            },
            {
              date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
              kroy: 0,
              joma: 15000,
              description: "বকেয়া পরিশোধ জমা",
            },
          ],
        },
      },
      {
        name: "আনোয়ার ট্রেডিং কর্পোরেশন",
        phone: "01819665544",
        address: "ঝাড়বাড়ী হাট, ঠাকুরগাঁও",
        notes: "সরিষা খৈল ও কুড়া সরবরাহকারী",
        transactions: {
          create: [
            {
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              kroy: 85000,
              joma: 50000,
              description: "সরিষা খৈল ২০ বস্তা ও গম কুড়া",
            },
          ],
        },
      },
      {
        name: "প্রিমিয়ার এগ্রো সাপ্লাইয়ার্স",
        phone: "01912334455",
        address: "রানীশংকৈল, ঠাকুরগাঁও",
        notes: "পোল্ট্রি মেডিসিন ও খাদ্য সরবরাহ",
        transactions: {
          create: [
            {
              date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
              kroy: 42000,
              joma: 42000,
              description: "ক্যাটল মিনারেল ও প্রিমিক্স (নগদ পরিশোধ)",
            },
          ],
        },
      },
    ];

    for (const p of sampleParties) {
      await prisma.party.create({ data: p });
    }
    console.log(`✅ ${sampleParties.length} initial parties seeded!`);
  } else {
    console.log(`ℹ️  Parties collection already has ${partyCount} records.`);
  }

  console.log("🎉 Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
