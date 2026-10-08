import { databaseUrl } from "./database-config";
export function authSecret(value = process.env.AUTH_SECRET): Uint8Array {
  if (
    !value ||
    value.length < 32 ||
    /^(REPLACE_|MY_|sb_secret_|sb_publishable_)/.test(value) ||
    value === "fuctura-tecnologia-secure-auth-secret-key-32chars"
  )
    throw new Error(
      "AUTH_SECRET ausente ou inválido. Configure um segredo próprio aleatório de pelo menos 32 caracteres.",
    );
  return new TextEncoder().encode(value);
}
export function appOrigin(
  value = process.env.APP_URL,
  production = process.env.NODE_ENV === "production",
): string | undefined {
  if (!value && !production) return undefined;
  try {
    const url = new URL(value!);
    if (
      !["http:", "https:"].includes(url.protocol) ||
      (production && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      throw new Error();
    return url.origin;
  } catch {
    throw new Error(
      "APP_URL inválida. Em produção, configure a origem HTTPS sem caminho ou credenciais.",
    );
  }
}
export function productionConfiguration(
  env: Record<string, string | undefined> = process.env,
) {
  authSecret(env.AUTH_SECRET ?? "");
  appOrigin(env.APP_URL ?? "", true);
  for (const key of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!env[key]) throw new Error(`${key} obrigatória.`);
    const url = new URL(databaseUrl(env[key]!));
    if (
      url.searchParams.has("host") ||
      url.searchParams.get("sslaccept") === "accept_invalid_certs" ||
      url.searchParams.get("sslmode") === "disable"
    )
      throw new Error("Configuração PostgreSQL insegura.");
    if (
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) &&
      (url.searchParams.get("sslmode") !== "require" ||
        url.searchParams.get("sslaccept") !== "strict")
    )
      throw new Error("PostgreSQL remoto exige TLS validado.");
    if (
      key === "DIRECT_URL" &&
      (url.searchParams.get("pgbouncer") === "true" || url.port === "6543")
    )
      throw new Error("DIRECT_URL exige conexão direta ou Session Pooler.");
  }
  return { configured: true };
}
