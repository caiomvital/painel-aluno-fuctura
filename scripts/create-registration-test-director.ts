// Explicitly authorized bootstrap of ONE new director; no seed/upsert/cleanup.
import { randomBytes, randomUUID } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { productionConfiguration } from "../lib/production-config";
import { databaseUrl } from "../lib/database-config";
import { targetFingerprint } from "../lib/staging-target";
import { inspectDatabaseSchema } from "./supabase-schema";
const origin = "https://fuctura-hml.69.169.102.111.sslip.io";
const target = "689c60925ff3bf1915ddbeae49d85a82ce41d0143b2d1f0c109f7b358ba60d12";
const path = "/opt/painel-fuctura/.env.registration-hml";
async function run() {
  if (process.argv.slice(2).join(" ") !== `--apply --confirm=CREATE_TEST_DIRECTOR:${target}`)
    throw new Error("Confirmação específica obrigatória.");
  productionConfiguration(process.env);
  if (process.env.APP_ENV !== "staging" || process.env.APP_URL !== origin ||
      process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0" ||
      targetFingerprint(process.env.DATABASE_URL!) !== target ||
      targetFingerprint(process.env.DIRECT_URL!) !== target || existsSync(path))
    throw new Error("Alvo divergente ou arquivo de conta já existente.");
  const ready = await fetch(origin + "/api/health/ready", { redirect: "error", signal: AbortSignal.timeout(15000) });
  if (ready.status !== 200 || ready.headers.get("x-fuctura-environment") !== "staging" || (await ready.json()).status !== "ready")
    throw new Error("Homologação indisponível.");
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl(process.env.DIRECT_URL!) } }, log: [] });
  try {
    await db.$transaction(async tx => {
      await tx.$executeRaw`SET TRANSACTION READ ONLY`;
      const schema = await inspectDatabaseSchema(tx);
      if (schema.differences.length || schema.pendingMigrations.length || !schema.migrationHistoryVerified)
        throw new Error("Schema incompatível.");
    }, { timeout: 30000 });
    const email = `director-hml-${randomUUID()}@example.test`;
    const password = randomBytes(24).toString("base64url");
    const registrationPassword = randomBytes(5).toString("hex").slice(0, 7) + "1";
    // Save credentials first, exclusively and privately, so a failed login never loses access.
    writeFileSync(path, `STAGING_DIRECTOR_EMAIL=${email}\nSTAGING_DIRECTOR_PASSWORD=${password}\nHOMOLOGATION_REGISTRATION_PASSWORD=${registrationPassword}\nPLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/opt/google/chrome/chrome\n`, { mode: 0o600, flag: "wx" });
    const user = await db.user.create({ data: {
      email, name: "Diretor Fictício — Testes de Cadastro", role: "DIRETOR",
      passwordHash: await hash(password, 10), profile: { create: {} },
      director: { create: { department: "Homologação de cadastro" } },
    }, select: { id: true, email: true } });
    console.log(JSON.stringify({ created: true, user, target, credentialsFile: path }));
    const response = await fetch(origin + "/api/auth/login", {
      method: "POST", redirect: "error", signal: AbortSignal.timeout(15000),
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    if (response.status !== 200 || (await response.json()).user.role !== "DIRETOR") throw new Error("Login de diretor reprovado.");
    const session = /(?:^|\s)fuctura_session=([^;]+)/.exec(response.headers.get("set-cookie") ?? "")?.[1];
    if (!session) throw new Error("Sessão não recebida.");
    writeFileSync(path, `STAGING_DIRECTOR_SESSION=${session}\n`, { flag: "a", mode: 0o600 });
    console.log(JSON.stringify({ directorLogin: "APROVADO", sessionStored: true }));
  } finally { await db.$disconnect(); }
}
run().catch(() => { console.error("Criação/login interrompido. Preservar o arquivo protegido e consultar o estado; não repetir criação automaticamente."); process.exitCode = 1; });
