import { createHash } from "node:crypto";
import { databaseUrl } from "./database-config";
import { productionConfiguration, appOrigin } from "./production-config";
export interface StagingApproval {
  version: 1;
  environment: "staging";
  isolated: true;
  shared: false;
  targetSha256: string;
  origin: string;
  protectedTargets: string[];
  protectedOrigins: string[];
  protectedAuthSecrets: string[];
}
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");
export function targetFingerprint(value: string) {
  const url = new URL(databaseUrl(value));
  if (
    url.searchParams.has("host") ||
    (url.searchParams.get("schema") ?? "public") !== "public"
  )
    throw new Error("Destino de homologação recusado.");
  const direct = /^db\.([a-z0-9]{20})\.supabase\.co$/.exec(url.hostname);
  const pool = url.hostname.endsWith(".pooler.supabase.com")
    ? /\.([a-z0-9]{20})$/.exec(decodeURIComponent(url.username))
    : null;
  const project = direct?.[1] ?? pool?.[1];
  if (project) return digest(`supabase:${project}:${url.pathname}`);
  if (
    ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
    /\/[a-zA-Z0-9_]+_(test|homologation)$/.test(url.pathname)
  )
    return digest(
      `local:${url.hostname}:${url.port || "5432"}:${url.pathname}`,
    );
  throw new Error(
    "Use projeto Supabase isolado identificado ou banco local dedicado.",
  );
}
export function approveStagingTarget(
  env: Record<string, string | undefined>,
  input: unknown,
  confirmation?: string,
) {
  const a = input as StagingApproval;
  if (
    env.APP_ENV !== "staging" ||
    !a ||
    a.version !== 1 ||
    a.environment !== "staging" ||
    a.isolated !== true ||
    a.shared !== false
  )
    throw new Error("Homologação isolada não confirmada.");
  productionConfiguration(env);
  const hashes = [
    a.targetSha256,
    ...(a.protectedTargets ?? []),
    ...(a.protectedAuthSecrets ?? []),
  ];
  if (
    !hashes.every((h) => typeof h === "string" && /^[a-f0-9]{64}$/.test(h)) ||
    !Array.isArray(a.protectedTargets) ||
    !a.protectedTargets.length ||
    !Array.isArray(a.protectedAuthSecrets) ||
    !a.protectedAuthSecrets.length ||
    !Array.isArray(a.protectedOrigins) ||
    !a.protectedOrigins.length
  )
    throw new Error("Inventário protegido ausente ou inválido.");
  const target = targetFingerprint(env.DATABASE_URL!);
  if (
    target !== a.targetSha256 ||
    targetFingerprint(env.DIRECT_URL!) !== target ||
    a.protectedTargets.includes(target)
  )
    throw new Error(
      "Destino divergente ou protegido; nenhuma escrita permitida.",
    );
  const origin = appOrigin(env.APP_URL, true)!;
  if (
    origin !== a.origin ||
    a.protectedOrigins.map((o) => appOrigin(o, true)).includes(origin) ||
    a.protectedAuthSecrets.includes(digest(env.AUTH_SECRET!))
  )
    throw new Error("Origem/segredo compartilhado ou divergente.");
  const expected = `CREATE_FICTIONAL_DATA:${target}`;
  if (confirmation !== undefined && confirmation !== expected)
    throw new Error("Confirmação explícita do alvo inválida.");
  return { target, origin, confirmation: expected };
}

export function fictionalAccountPassword(
  value: unknown,
  authSecret?: string,
): string {
  if (
    typeof value !== "string" ||
    value.length < 12 ||
    Buffer.byteLength(value, "utf8") > 72 ||
    /^(REPLACE_|Password123!$)/.test(value) ||
    value === authSecret
  )
    throw new Error("Senha exclusiva das contas fictícias inválida.");
  return value;
}

export function requireProvisioningMaintenance(
  value: string | undefined,
): void {
  if (value !== "1")
    throw new Error(
      "Confirme serviço de homologação parado antes do provisionamento.",
    );
}
