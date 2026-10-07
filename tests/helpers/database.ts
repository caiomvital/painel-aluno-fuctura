/** Refuse remote/shared targets before any migration, seed, cleanup or test write. */
export function assertTestDatabase(value: string | undefined): string {
  if (!value)
    throw new Error(
      "Defina TEST_DATABASE_URL para um PostgreSQL local descartável.",
    );
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("URL de banco de testes inválida.");
  }
  if (
    !["postgresql:", "postgres:"].includes(url.protocol) ||
    !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname) ||
    !/^\/[A-Za-z0-9_]+_test$/.test(url.pathname) ||
    url.searchParams.has("host")
  ) {
    throw new Error(
      "Banco recusado: use host loopback e nome terminado em _test.",
    );
  }
  return value;
}
