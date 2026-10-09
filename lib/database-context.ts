import { AsyncLocalStorage } from 'node:async_hooks';
import type { Prisma } from '@prisma/client';

// Audited HTTP mutations and their service calls share one database transaction.
export const databaseContext = new AsyncLocalStorage<Prisma.TransactionClient>();
