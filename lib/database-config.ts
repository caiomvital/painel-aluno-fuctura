/** Normalize Prisma's PostgreSQL configuration without changing local connections. */
export function databaseUrl(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname === "/"
    )
      throw new Error();
  } catch {
    // Never include a credential-bearing URL in configuration errors.
    throw new Error(
      "URL PostgreSQL inválida. Verifique a configuração segura de DATABASE_URL/DIRECT_URL.",
    );
  }
  if (!isSupabaseHost(url.hostname)) return value;
  url.searchParams.set("sslmode", "require");
  url.searchParams.set("sslaccept", "strict");
  if (url.hostname.endsWith(".pooler.supabase.com") && url.port === "6543")
    url.searchParams.set("pgbouncer", "true");
  return url.toString();
}
export function isSupabaseHost(host: string): boolean {
  return host.endsWith(".supabase.co") || host.endsWith(".supabase.com");
}
