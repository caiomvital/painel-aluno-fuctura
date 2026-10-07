// lib/prisma.ts
// Singleton instance of PrismaClient for Next.js to prevent connection exhaustion during development hot-reloads

import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getPrismaClient(): PrismaClient {
  let dbUrl = process.env.DATABASE_URL;
  if (dbUrl && !dbUrl.includes('pgbouncer=true') && (dbUrl.includes(':6543') || dbUrl.includes('pooler'))) {
    dbUrl += (dbUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
  }

  return new PrismaClient({
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });
}

export const prisma = globalForPrisma.prisma || getPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
