import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

import { rawLegacyProducts } from "../src/data/products";

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

  console.log("🌱 Checking products...");
  const productCount = await prisma.product.count();
  if (productCount === 0) {
    console.log("🌱 Seeding initial products with updated schema...");
    let seededCount = 0;
    for (const item of rawLegacyProducts) {
      const numericPrice = parseFloat(item.price.replace(/[^0-9.]/g, "")) || 0;
      await prisma.product.create({
        data: {
          id: item.id,
          name: item.name,
          subtitle: item.subtitle,
          stock: 50,
          price: numericPrice,
          description: `${item.name} - ${item.subtitle}। উচ্চমানের প্রিমিয়াম গবাদি পশু খাদ্য।`,
          image: item.image,
          badge: item.badge || "",
          unit: "KG",
        },
      });
      seededCount++;
    }
    console.log(`✅ ${seededCount} products seeded successfully!`);
  } else {
    console.log(`ℹ️  Products collection already has ${productCount} records.`);
  }

  console.log("🌱 Checking customers...");
  const customerCount = await prisma.customer.count();
  if (customerCount === 0) {
    console.log("🌱 Seeding initial customers...");
    const sampleCustomers = [
      {
        name: "রহিম ডেইরি ফার্ম",
        email: "rahim.dairy@example.com",
        phone: "01711223344",
        address: "পাবনা সদর, পাবনা",
        is_vip: true,
        type: "WHOLESALE" as const,
      },
      {
        name: "আলমগীর ক্যাটল ফিড",
        email: "alamgir.feed@example.com",
        phone: "01811556677",
        address: "শাহজাদপুর, সিরাজগঞ্জ",
        is_vip: false,
        type: "WHOLESALE" as const,
      },
      {
        name: "গ্রীন ডেইরি অ্যান্ড এগ্রো",
        email: "greendairy@example.com",
        phone: "01911889900",
        address: "শেরপুর, বগুড়া",
        is_vip: true,
        type: "BOTH" as const,
      },
      {
        name: "হাজী আব্দুল্লাহ খামার",
        email: "abdullah.farm@example.com",
        phone: "01611334455",
        address: "সিংড়া, নাটোর",
        is_vip: false,
        type: "RETAIL" as const,
      },
      {
        name: "সোনালী ফিশারিজ ও ডেইরি",
        email: "sonali.farm@example.com",
        phone: "01722446688",
        address: "মিঠাপুকুর, রংপুর",
        is_vip: true,
        type: "BOTH" as const,
      },
    ];

    for (const cust of sampleCustomers) {
      await prisma.customer.create({ data: cust });
    }
    console.log(`✅ ${sampleCustomers.length} initial customers seeded!`);
  } else {
    console.log(`ℹ️  Customers collection already has ${customerCount} records.`);
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
