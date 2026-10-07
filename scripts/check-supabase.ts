import { Prisma, PrismaClient } from "@prisma/client";
import { mkdirSync, writeFileSync } from "node:fs";

type Report = {
  status: "passed" | "failed" | "pending";
  reason?: string;
  tables?: number;
  columns?: number;
  reads?: number;
};
async function check(): Promise<Report> {
  const value = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
  if (!value)
    return { status: "pending", reason: "Conexão Supabase não configurada." };
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { status: "pending", reason: "Conexão configurada inválida." };
  }
  if (
    !["postgres:", "postgresql:"].includes(url.protocol) ||
    !/\.(supabase\.co|supabase\.com)$/.test(url.hostname)
  )
    return {
      status: "pending",
      reason: "Conexão configurada não aponta para Supabase.",
    };
  url.searchParams.set("connect_timeout", "5");
  url.searchParams.set("pool_timeout", "5");
  url.searchParams.set("connection_limit", "1");
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  if (url.port === "6543") url.searchParams.set("pgbouncer", "true");
  const client = new PrismaClient({
    datasources: { db: { url: url.toString() } },
  });
  try {
    // Every operation here is read-only. Never call seed, migrate, update or delete.
    await client.$queryRaw`SELECT 1`;
    const columns = await client.$queryRaw<
      Array<{
        table_name: string;
        column_name: string;
        data_type: string;
        udt_name: string;
        is_nullable: string;
      }>
    >`
      SELECT table_name, column_name, data_type, udt_name, is_nullable
      FROM information_schema.columns WHERE table_schema = 'public'`;
    const allowedTypes: Record<string, string[]> = {
      String: ["text", "character varying", "uuid"],
      Int: ["integer"],
      Float: ["double precision", "real"],
      Boolean: ["boolean"],
      DateTime: ["timestamp without time zone", "timestamp with time zone"],
      Json: ["jsonb", "json"],
      BigInt: ["bigint"],
      Decimal: ["numeric"],
      Bytes: ["bytea"],
    };
    let expectedColumns = 0;
    for (const model of Prisma.dmmf.datamodel.models) {
      for (const field of model.fields.filter(
        (field) => field.kind !== "object",
      )) {
        expectedColumns++;
        const column = columns.find(
          (column) =>
            column.table_name === (model.dbName || model.name) &&
            column.column_name === (field.dbName || field.name),
        );
        if (!column)
          return {
            status: "failed",
            reason: `Coluna necessária ausente: ${model.name}.${field.name}`,
          };
        if (
          field.isList
            ? column.data_type !== "ARRAY"
            : field.kind === "enum"
              ? column.udt_name !== field.type
              : !allowedTypes[field.type]?.includes(column.data_type)
        ) {
          return {
            status: "failed",
            reason: `Tipo incompatível: ${model.name}.${field.name}`,
          };
        }
        if (field.isRequired && !field.isList && column.is_nullable === "YES")
          return {
            status: "failed",
            reason: `Nulabilidade incompatível: ${model.name}.${field.name}`,
          };
      }
    }
    // Select only IDs, never print real students, teachers or academic data.
    await client.user.findMany({ select: { id: true }, take: 1 });
    await client.class.findMany({ select: { id: true }, take: 1 });
    await client.lesson.findMany({
      select: { id: true, classId: true },
      take: 1,
    });
    await client.lessonContent.findMany({
      select: { id: true, lessonId: true },
      take: 1,
    });
    return {
      status: "passed",
      tables: Prisma.dmmf.datamodel.models.length,
      columns: expectedColumns,
      reads: 5,
    };
  } catch (error: unknown) {
    const code =
      (error as { code?: string; errorCode?: string }).code ||
      (error as { errorCode?: string }).errorCode;
    return {
      status: "pending",
      reason: `Não foi possível validar a conexão de leitura${code ? ` (${code})` : ""}.`,
    };
  } finally {
    await client.$disconnect();
  }
}
const report = await check();
mkdirSync("test-results", { recursive: true });
writeFileSync("test-results/supabase.json", JSON.stringify(report, null, 2));
console.log("Supabase:", JSON.stringify(report));
if (report.status === "failed") process.exitCode = 1;
