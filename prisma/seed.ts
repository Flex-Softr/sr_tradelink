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
