import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import { assertTestDatabase } from "../tests/helpers/database";
import { inspectDatabaseSchema } from "./supabase-schema";
const p = new PrismaClient({
  datasources: { db: { url: assertTestDatabase(process.env.DATABASE_URL) } },
});
try {
  const report = await p.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      return inspectDatabaseSchema(tx);
    },
    { timeout: 30000 },
  );
  assert.deepEqual(report.differences, []);
  assert.deepEqual(report.pendingMigrations, []);
  assert.equal(report.migrationHistoryVerified, true);
  assert(
    report.tables > 0 &&
      report.columns > 0 &&
      report.indexes > 0 &&
      report.foreignKeys > 0,
  );
  console.log(
    "PASS diagnóstico de schema em PostgreSQL isolado, transação READ ONLY:",
    JSON.stringify(report),
  );
} finally {
  await p.$disconnect();
}
