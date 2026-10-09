// lib/prisma.ts
// Singleton instance of PrismaClient for Next.js to prevent connection exhaustion during development hot-reloads

import { PrismaClient } from "@prisma/client";
import { databaseUrl } from "./database-config";
import { databaseContext } from './database-context';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  const dbUrl = process.env.DATABASE_URL
    ? databaseUrl(process.env.DATABASE_URL)
    : undefined;

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: [], // Errors are logged through the allowlisted operational logger.
  });
}

const client = globalForPrisma.prisma || getPrismaClient();
export const prisma = new Proxy(client, {
  get(target, property) {
    const transaction = databaseContext.getStore();
    if (transaction && property === '$transaction') {
      return (work: (tx: typeof transaction) => Promise<unknown>) => {
        if (typeof work !== 'function') throw new Error('Transação auditada exige callback.');
        return work(transaction);
      };
    }
    const source = transaction ?? target;
    const value = Reflect.get(source, property);
    return typeof value === 'function' ? value.bind(source) : value;
  },
});

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = client;
}

export default prisma;
