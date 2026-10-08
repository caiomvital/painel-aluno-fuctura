// Read-only gate. Never deploys, seeds or applies migrations.
import { PrismaClient } from "@prisma/client";
import { productionConfiguration } from "../lib/production-config";
import { databaseUrl } from "../lib/database-config";
import { inspectDatabaseSchema } from "./supabase-schema";
import { operationalLog } from "../lib/operational-log";
async function run() {
  const steps: {
    name: string;
    status: "APROVADO" | "PENDENTE" | "BLOQUEADO";
  }[] = [];
  try {
    productionConfiguration();
    steps.push({ name: "Configuração de produção", status: "APROVADO" });
  } catch {
    steps.push({ name: "Configuração de produção", status: "BLOQUEADO" });
    console.log(JSON.stringify({ safeToProceed: false, steps }));
    process.exitCode = 1;
    return;
  }
  let safe = true;
  for (const variable of ["DATABASE_URL", "DIRECT_URL"]) {
    const client = new PrismaClient({
      datasources: { db: { url: databaseUrl(process.env[variable]!) } },
      log: [],
    });
    try {
      await client.$transaction(
        async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          await tx.$executeRaw`SET LOCAL statement_timeout = '10000ms'`;
          const rows = await tx.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
          if (rows[0]?.ok !== 1) throw new Error();
          steps.push({ name: `${variable}: leitura real`, status: "APROVADO" });
          const schema = await inspectDatabaseSchema(tx);
          const compatible =
            schema.differences.length === 0 &&
            schema.pendingMigrations.length === 0 &&
            schema.migrationHistoryVerified;
          safe &&= compatible;
          steps.push({
            name: `${variable}: schema/migrations`,
            status: compatible ? "APROVADO" : "BLOQUEADO",
          });
          console.log(JSON.stringify({ variable, schema }));
        },
        { timeout: 30000, maxWait: 5000 },
      );
    } catch (error) {
      safe = false;
      operationalLog("preflight.database.failed", error);
      steps.push({ name: `${variable}: banco`, status: "BLOQUEADO" });
    } finally {
      await client.$disconnect();
    }
  }
  console.log(
    JSON.stringify({
      safeToProceed: safe,
      steps,
      note: "Este resultado técnico não autoriza deploy; backup/restauração e homologação continuam obrigatórios.",
    }),
  );
  if (!safe) process.exitCode = 1;
}
run().catch((error) => {
  operationalLog("preflight.failed", error);
  process.exitCode = 1;
});
