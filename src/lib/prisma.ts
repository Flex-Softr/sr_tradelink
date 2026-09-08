import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaClient(): PrismaClient {
  const existing = globalForPrisma.prisma;
  // If the cached dev client is missing newly added models (e.g. transaction), recreate it
  if (existing && !("transaction" in (existing as unknown as Record<string, unknown>))) {
    const refreshed = new PrismaClient();
    globalForPrisma.prisma = refreshed;
    return refreshed;
  }
  return existing ?? new PrismaClient();
}

export const prisma = getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
