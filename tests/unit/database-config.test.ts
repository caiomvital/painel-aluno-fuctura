import { describe, expect, test } from "bun:test";
import { databaseUrl } from "../../lib/database-config";
describe("configuração PostgreSQL", () => {
  test("preserva PostgreSQL local sem obrigar TLS", () => {
    const value =
      "postgresql://test:local@127.0.0.1:5432/app_test?connection_limit=2";
    expect(databaseUrl(value)).toBe(value);
  });
  test("exige TLS validado para Supabase direto", () => {
    const u = new URL(
      databaseUrl(
        "postgresql://postgres:example@db.project.supabase.co:5432/postgres",
      ),
    );
    expect(u.searchParams.get("sslmode")).toBe("require");
    expect(u.searchParams.get("sslaccept")).toBe("strict");
    expect(u.searchParams.has("pgbouncer")).toBe(false);
  });
  test("Transaction Pooler ativa compatibilidade sem parâmetros duplicados", () => {
    const u = new URL(
      databaseUrl(
        "postgresql://postgres.project:example@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=false",
      ),
    );
    expect(u.searchParams.getAll("pgbouncer")).toEqual(["true"]);
  });
  test("Session Pooler não ativa modo de transação por nome do host", () => {
    const u = new URL(
      databaseUrl(
        "postgresql://postgres.project:example@aws-0-sa-east-1.pooler.supabase.com:5432/postgres",
      ),
    );
    expect(u.searchParams.has("pgbouncer")).toBe(false);
  });
  test("não permite desativar TLS ou validação em Supabase", () => {
    const u = new URL(
      databaseUrl(
        "postgresql://postgres:example@db.project.supabase.co:5432/postgres?sslmode=disable&sslaccept=accept_invalid_certs",
      ),
    );
    expect(u.searchParams.get("sslmode")).toBe("require");
    expect(u.searchParams.get("sslaccept")).toBe("strict");
  });
  test("preserva credenciais escapadas, schema e certificado CA", () => {
    const raw =
      "postgresql://postgres.project:example%40pass%3Aword@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?schema=public&sslcert=%2Ftmp%2Fpublic-ca.pem";
    const u = new URL(databaseUrl(raw));
    expect(u.password).toBe("example%40pass%3Aword");
    expect(u.searchParams.get("schema")).toBe("public");
    expect(u.searchParams.get("sslcert")).toBe("/tmp/public-ca.pem");
  });
  test("erro de URL inválida nunca inclui credenciais", () => {
    expect(() => databaseUrl("https://user:do-not-log@example.com/db")).toThrow(
      "URL PostgreSQL inválida.",
    );
    try {
      databaseUrl("https://user:do-not-log@example.com/db");
    } catch (e) {
      expect(String(e)).not.toContain("do-not-log");
    }
  });
});
