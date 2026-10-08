import { Prisma } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

export type SchemaReport = {
  tables: number;
  columns: number;
  indexes: number;
  foreignKeys: number;
  differences: string[];
  pendingMigrations: string[];
  migrationHistoryVerified: boolean;
};
export async function inspectDatabaseSchema(
  tx: Prisma.TransactionClient,
): Promise<SchemaReport> {
  const differences: string[] = [];
  const columns = await tx.$queryRaw<
    Array<{
      table_name: string;
      column_name: string;
      data_type: string;
      udt_name: string;
      is_nullable: string;
      column_default: string | null;
    }>
  >`
 SELECT table_name,column_name,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema='public'`;
  const enums = await tx.$queryRaw<
    Array<{ name: string; value: string }>
  >`SELECT t.typname AS name,e.enumlabel AS value FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname='public' ORDER BY e.enumsortorder`;
  const indexes = await tx.$queryRaw<
    Array<{
      table_name: string;
      name: string;
      unique: boolean;
      valid: boolean;
      columns: string[];
      predicate: string | null;
    }>
  >`
 SELECT t.relname AS table_name,i.relname AS name,x.indisunique AS unique,x.indisvalid AS valid,
 ARRAY(SELECT a.attname::text FROM unnest(x.indkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=k.num WHERE k.ord<=x.indnkeyatts ORDER BY k.ord) AS columns,
 pg_get_expr(x.indpred,x.indrelid) AS predicate
 FROM pg_index x JOIN pg_class i ON i.oid=x.indexrelid JOIN pg_class t ON t.oid=x.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname='public'`;
  const constraints = await tx.$queryRaw<
    Array<{
      table_name: string;
      name: string;
      type: string;
      valid: boolean;
      reference_table: string | null;
      columns: string[];
      reference_columns: string[];
    }>
  >`
 SELECT t.relname AS table_name,c.conname AS name,c.contype::text AS type,c.convalidated AS valid,r.relname AS reference_table,
 ARRAY(SELECT a.attname::text FROM unnest(c.conkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.num ORDER BY k.ord) AS columns,
 ARRAY(SELECT a.attname::text FROM unnest(c.confkey) WITH ORDINALITY k(num,ord) JOIN pg_attribute a ON a.attrelid=c.confrelid AND a.attnum=k.num ORDER BY k.ord) AS reference_columns
 FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace LEFT JOIN pg_class r ON r.oid=c.confrelid WHERE n.nspname='public' AND c.contype IN ('p','f')`;
  const allowed: Record<string, string[]> = {
    String: ["text", "character varying"],
    Int: ["integer"],
    Float: ["double precision"],
    Boolean: ["boolean"],
    DateTime: ["timestamp without time zone", "timestamp with time zone"],
    Json: ["jsonb", "json"],
    BigInt: ["bigint"],
    Decimal: ["numeric"],
    Bytes: ["bytea"],
  };
  let expectedColumns = 0;
  for (const model of Prisma.dmmf.datamodel.models) {
    const table = model.dbName || model.name;
    if (!columns.some((c) => c.table_name === table)) {
      differences.push(`Tabela ausente: ${table}`);
      continue;
    }
    for (const field of model.fields.filter((f) => f.kind !== "object")) {
      expectedColumns++;
      const column = columns.find(
        (c) =>
          c.table_name === table &&
          c.column_name === (field.dbName || field.name),
      );
      if (!column) {
        differences.push(`Coluna ausente: ${table}.${field.name}`);
        continue;
      }
      if (
        field.isList
          ? column.data_type !== "ARRAY"
          : field.kind === "enum"
            ? column.udt_name !== field.type
            : !allowed[field.type]?.includes(column.data_type)
      )
        differences.push(`Tipo incompatível: ${table}.${field.name}`);
      if (field.isRequired && !field.isList && column.is_nullable === "YES")
        differences.push(
          `Coluna obrigatória permite NULL: ${table}.${field.name}`,
        );
      if (
        field.isId &&
        !constraints.some(
          (c) =>
            c.table_name === table &&
            c.type === "p" &&
            c.columns.includes(field.dbName || field.name),
        )
      )
        differences.push(`Chave primária ausente: ${table}.${field.name}`);
    }
  }
  for (const en of Prisma.dmmf.datamodel.enums)
    for (const value of en.values)
      if (
        !enums.some(
          (e) =>
            e.name === (en.dbName || en.name) &&
            e.value === (value.dbName || value.name),
        )
      )
        differences.push(`Valor de enum ausente: ${en.name}.${value.name}`);
  const migrationsDir = join(import.meta.dirname, "..", "prisma", "migrations");
  const migrations = readdirSync(migrationsDir)
    .filter((name) => /^\d+_/.test(name))
    .sort();
  let expectedIndexes = 0,
    expectedForeignKeys = 0;
  const quotedNames = (s: string) =>
    Array.from(s.matchAll(/"([^"]+)"/g), (m) => m[1]);
  for (const migration of migrations) {
    const sql = readFileSync(
      join(migrationsDir, migration, "migration.sql"),
      "utf8",
    );
    for (const m of sql.matchAll(
      /CREATE (UNIQUE )?INDEX "([^"]+)" ON "([^"]+)"\(([^)]+)\)([^;]*);/g,
    )) {
      expectedIndexes++;
      const actual = indexes.find(
        (i) => i.name === m[2] && i.table_name === m[3],
      );
      if (!actual) {
        differences.push(`Índice ausente: ${m[2]}`);
        continue;
      }
      if (
        !actual.valid ||
        actual.unique !== Boolean(m[1]) ||
        JSON.stringify(actual.columns) !== JSON.stringify(quotedNames(m[4]))
      )
        differences.push(`Índice incompatível/inválido: ${m[2]}`);
      const partial = m[5].trim().startsWith("WHERE");
      if (
        partial
          ? !actual.predicate ||
            actual.predicate
              .replace(/::"?\w+"?/g, "")
              .replace(/[()"\s]/g, "") !== "status='ACTIVE'"
          : actual.predicate !== null
      )
        differences.push(`Predicado incompatível do índice: ${m[2]}`);
    }
    for (const m of sql.matchAll(
      /ALTER TABLE "([^"]+)" ADD CONSTRAINT "([^"]+)" FOREIGN KEY \(([^)]+)\) REFERENCES "([^"]+)"\(([^)]+)\)/g,
    )) {
      expectedForeignKeys++;
      const actual = constraints.find(
        (c) => c.table_name === m[1] && c.name === m[2] && c.type === "f",
      );
      if (
        !actual ||
        !actual.valid ||
        actual.reference_table !== m[4] ||
        JSON.stringify(actual.columns) !== JSON.stringify(quotedNames(m[3])) ||
        JSON.stringify(actual.reference_columns) !==
          JSON.stringify(quotedNames(m[5]))
      )
        differences.push(`Chave estrangeira ausente/incompatível: ${m[2]}`);
    }
  }
  const hasHistory = await tx.$queryRaw<
    Array<{ exists: boolean }>
  >`SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='_prisma_migrations') AS exists`;
  let pendingMigrations: string[] = [];
  if (hasHistory[0]?.exists) {
    const history = await tx.$queryRaw<
      Array<{
        migration_name: string;
        checksum: string;
        finished_at: Date | null;
        rolled_back_at: Date | null;
      }>
    >`SELECT migration_name,checksum,finished_at,rolled_back_at FROM public._prisma_migrations`;
    for (const migration of migrations) {
      const applied = history.find(
        (h) =>
          h.migration_name === migration && h.finished_at && !h.rolled_back_at,
      );
      if (!applied) pendingMigrations.push(migration);
      else if (
        applied.checksum !==
        createHash("sha256")
          .update(readFileSync(join(migrationsDir, migration, "migration.sql")))
          .digest("hex")
      )
        differences.push(`Checksum divergente da migration: ${migration}`);
    }
    for (const h of history)
      if (!h.finished_at && !h.rolled_back_at)
        differences.push(`Migration interrompida: ${h.migration_name}`);
  } else {
    differences.push(
      "Histórico _prisma_migrations ausente: aplicação das migrations não comprovada.",
    );
    pendingMigrations = migrations;
  }
  return {
    tables: Prisma.dmmf.datamodel.models.length,
    columns: expectedColumns,
    indexes: expectedIndexes,
    foreignKeys: expectedForeignKeys,
    differences,
    pendingMigrations,
    migrationHistoryVerified: Boolean(hasHistory[0]?.exists),
  };
}
