// lib/prisma.ts
// Singleton instance of PrismaClient for Next.js to prevent connection exhaustion during development hot-reloads

import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./database-config";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL
    ? databaseUrl(process.env.DATABASE_URL)
    : undefined;

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
