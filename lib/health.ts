import { prisma } from "./prisma";
import { productionConfiguration } from "./production-config";
import { operationalLog } from "./operational-log";
export async function healthDetails() {
  const state = {
    application: true,
    configuration: false,
    database: false,
    migrations: false,
    ready: false,
  };
  try {
    if (process.env.NODE_ENV === "production") productionConfiguration();
    state.configuration = true;
    await prisma.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        await tx.$executeRaw`SET LOCAL statement_timeout = '2000ms'`;
        const alive = await tx.$queryRaw<{ ok: number }[]>`SELECT 1 AS ok`;
        state.database = alive[0]?.ok === 1;
        const migrations = await tx.$queryRaw<
          { ok: number }[]
        >`SELECT 1 AS ok FROM "_prisma_migrations" WHERE migration_name = '20261008_student_registration_approval' AND finished_at IS NOT NULL AND rolled_back_at IS NULL LIMIT 1`;
        state.migrations = migrations[0]?.ok === 1;
      },
      { maxWait: 2000, timeout: 3000 },
    );
    state.ready = state.configuration && state.database && state.migrations;
  } catch (error) {
    operationalLog("health.readiness.failed", error);
  }
  return state;
}
export async function readiness() {
  return (await healthDetails()).ready;
}
