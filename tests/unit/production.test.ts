import { describe, test, expect } from "bun:test";
import { SignJWT } from "jose";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { compare } from "bcryptjs";
import {
  authSecret,
  appOrigin,
  productionConfiguration,
} from "../../lib/production-config";
import {
  createSessionToken,
  verifySessionToken,
  sessionCookieOptions,
} from "../../lib/session-token";
import { permittedMutation } from "../../lib/request-security";
import { operationalLog, publicError } from "../../lib/operational-log";
import { takeLoginAttempt, clearLoginAttempts } from "../../lib/login-limiter";
import { initialPasswordHash } from "../../lib/account-password";
const origin = "https://fuctura.example.test";
const configuration = {
  AUTH_SECRET: "test-only-secret-32-characters-long-value",
  APP_URL: origin,
  DATABASE_URL: "postgresql://test:local@127.0.0.1:5432/app_test",
  DIRECT_URL: "postgresql://test:local@127.0.0.1:5432/app_test",
};
describe("Marco 10: configuração, sessão e proteção", () => {
  test("configuração local de produção é válida sem conectar ao banco", () =>
    expect(productionConfiguration(configuration)).toEqual({
      configured: true,
    }));
  test("variáveis obrigatórias são verificadas", () => {
    for (const key of Object.keys(configuration))
      expect(() =>
        productionConfiguration({ ...configuration, [key]: undefined }),
      ).toThrow();
  });
  test("segredo padrão, ausente, placeholder e chave de API são rejeitados", () => {
    for (const s of [
      "",
      "short",
      "REPLACE_WITH_A_RANDOM_32_CHARACTER_SECRET",
      "sb_secret_example_32_characters_long_key",
      "fuctura-tecnologia-secure-auth-secret-key-32chars",
    ])
      expect(() => authSecret(s)).toThrow();
  });
  test("origem de produção exige HTTPS sem credenciais/caminho", () => {
    for (const s of [
      "http://example.test",
      "https://u:p@example.test",
      "https://example.test/path",
      "https://example.test?x=1",
    ])
      expect(() => appOrigin(s, true)).toThrow();
    expect(appOrigin(undefined, false)).toBeUndefined();
  });
  test("PostgreSQL remoto exige validação TLS e DIRECT_URL não é Transaction Pooler", () => {
    expect(() =>
      productionConfiguration({
        ...configuration,
        DATABASE_URL: "postgresql://test:local@db.example.test/app",
      }),
    ).toThrow();
    expect(() =>
      productionConfiguration({
        ...configuration,
        DIRECT_URL: "postgresql://test:local@127.0.0.1:6543/app_test",
      }),
    ).toThrow();
    expect(() =>
      productionConfiguration({
        ...configuration,
        DATABASE_URL: configuration.DATABASE_URL + "?host=other",
      }),
    ).toThrow();
  });
  test("cookie de produção é HttpOnly, Secure, SameSite=Lax e expira em sete dias", () =>
    expect(sessionCookieOptions(true)).toEqual({
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 604800,
    }));
  test("JWT válido mantém perfil e rejeita adulteração", async () => {
    const token = await createSessionToken({
      id: "user",
      name: "Teste",
      email: "user@example.test",
      role: "ALUNO",
    });
    expect((await verifySessionToken(token))?.id).toBe("user");
    expect(await verifySessionToken(token + "altered")).toBeNull();
  });
  test("JWT expirado, sem expiração, algoritmo incorreto ou perfil inválido é rejeitado", async () => {
    for (const kind of [
      "expired",
      "missing",
      "algorithm",
      "role",
      "subject",
      "issuer",
    ]) {
      const jwt = new SignJWT({
        id: "u",
        name: "Teste",
        email: "u@example.test",
        role: kind === "role" ? "ADMIN" : "DIRETOR",
      })
        .setProtectedHeader({ alg: kind === "algorithm" ? "HS384" : "HS256" })
        .setIssuer(kind === "issuer" ? "other" : "fuctura")
        .setAudience("fuctura-panel")
        .setSubject(kind === "subject" ? "other" : "u")
        .setIssuedAt();
      if (kind !== "missing")
        jwt.setExpirationTime(kind === "expired" ? "0s" : "1h");
      expect(await verifySessionToken(await jwt.sign(authSecret()))).toBeNull();
    }
  });
  test("CSRF bloqueia origem externa, null, cross-site e ausência em produção", () => {
    for (const headers of [
      { Origin: "https://evil.example.test" },
      { Origin: "null" },
      { Origin: origin, "Sec-Fetch-Site": "cross-site" },
      {},
    ])
      expect(
        permittedMutation(
          new Request(origin + "/api/auth/login", {
            method: "POST",
            headers: headers as Record<string, string>,
          }),
          origin,
          true,
        ),
      ).toBe(false);
  });
  test("CSRF aceita origem configurada em POST/PUT/DELETE e leitura pública", () => {
    for (const method of ["POST", "PUT", "DELETE"])
      expect(
        permittedMutation(
          new Request(origin + "/api/x", {
            method,
            headers: { Origin: origin },
          }),
          origin,
          true,
        ),
      ).toBe(true);
    expect(
      permittedMutation(new Request(origin + "/api/x"), origin, true),
    ).toBe(true);
  });
  test("origem ausente somente é permitida em desenvolvimento", () =>
    expect(
      permittedMutation(
        new Request("http://localhost/api/x", { method: "POST" }),
        undefined,
        false,
      ),
    ).toBe(true));
  test("desenvolvimento usa Host real sem relaxar a origem canônica de produção", () => {
    const request = new Request("http://localhost:3100/api/auth/login", {
      method: "POST",
      headers: { Host: "127.0.0.1:3100", Origin: "http://127.0.0.1:3100" },
    });
    expect(permittedMutation(request, undefined, false)).toBe(true);
    expect(permittedMutation(request, origin, true)).toBe(false);
    expect(
      permittedMutation(
        new Request(origin + "/api/x", {
          method: "POST",
          headers: {
            Host: "evil.example.test",
            Origin: "https://evil.example.test",
          },
        }),
        origin,
        true,
      ),
    ).toBe(false);
  });
  test("limite de login é normalizado, bloqueia a 11ª tentativa e expira", () => {
    const email = randomUUID() + "@example.test";
    for (let i = 0; i < 10; i++)
      expect(takeLoginAttempt(email, 100)).toBe(true);
    expect(takeLoginAttempt(email.toUpperCase(), 100)).toBe(false);
    expect(takeLoginAttempt(email, 600101)).toBe(true);
    clearLoginAttempts(email);
    expect(takeLoginAttempt(email, 600101)).toBe(true);
    clearLoginAttempts(email);
  });
  test("logs e erros públicos não serializam credenciais, cookies, stack ou dados pessoais", () => {
    const lines: string[] = [];
    const original = console.error;
    console.error = (s) => {
      lines.push(String(s));
    };
    try {
      const e = Object.assign(
        new Error(
          "postgresql://user:SENTINEL_SECRET@db.test/db cookie token email@example.test",
        ),
        {
          code: "P1001",
          stack: "SECRET_STACK",
          meta: { password: "SENTINEL_SECRET" },
        },
      );
      operationalLog("database.failed", e, {
        requestId: randomUUID(),
        status: 503,
      });
      expect(publicError(e, "Falha controlada.")).toBe("Falha controlada.");
      expect(lines.join(" ")).not.toMatch(
        /SENTINEL_SECRET|SECRET_STACK|postgresql|email@example/,
      );
      expect(JSON.parse(lines[0]).code).toBe("P1001");
    } finally {
      console.error = original;
    }
  });
  test("erros de duplicidade/autorização/JSON são seguros e úteis", () => {
    const original = console.error;
    console.error = () => {};
    try {
      expect(publicError({ code: "P2002" }, "x")).toContain("já existe");
      expect(publicError({ statusCode: 403 }, "x")).toContain("Acesso negado");
      expect(publicError(new SyntaxError("SECRET"), "x")).toBe(
        "Corpo JSON inválido.",
      );
    } finally {
      console.error = original;
    }
  });
  test("cadastro em produção não pode usar senha padrão", async () => {
    await expect(initialPasswordHash(undefined, true)).rejects.toThrow();
    await expect(initialPasswordHash("short", true)).rejects.toThrow();
    await expect(initialPasswordHash("a".repeat(73), true)).rejects.toThrow();
    const password = "Test-only-secure-789!";
    expect(
      await compare(password, await initialPasswordHash(password, true)),
    ).toBe(true);
  });
});
describe("Marco 10: service worker e privacidade", () => {
  const deleted: string[] = [];
  function worker() {
    const events: Record<string, (e: any) => void> = {};
    runInNewContext(readFileSync("public/sw.js", "utf8"), {
      self: {
        location: { origin },
        addEventListener: (name: string, fn: (e: any) => void) => {
          events[name] = fn;
        },
        skipWaiting() {},
        clients: { claim() {} },
      },
      caches: {
        match: async () => ({ public: true }),
        keys: async () => ["fuctura-v1", "other-app"],
        delete: async (name: string) => {
          deleted.push(name);
        },
      },
      URL,
      fetch() {},
    });
    return events;
  }
  test("navegação, APIs, terceiros e ícones com query nunca são interceptados", () => {
    const events = worker();
    for (const path of [
      "/",
      "/api/auth/me",
      "/api/director/dashboard",
      "https://third.example.test/icon-192.svg",
      "/icon.svg?user=private",
    ]) {
      let intercepted = false;
      events.fetch({
        request: { method: "GET", url: new URL(path, origin).href },
        respondWith: () => {
          intercepted = true;
        },
      });
      expect(intercepted).toBe(false);
    }
  });
  test("ícone público é servido e limpeza preserva cache de outra aplicação", async () => {
    const events = worker();
    let result: Promise<unknown> | undefined;
    events.fetch({
      request: { method: "GET", url: origin + "/icon.svg" },
      respondWith: (r: Promise<unknown>) => {
        result = r;
      },
    });
    expect(await result).toEqual({ public: true });
    let cleanup: Promise<unknown> | undefined;
    events.activate({
      waitUntil: (r: Promise<unknown>) => {
        cleanup = r;
      },
    });
    await cleanup;
    expect(deleted).toEqual(["fuctura-v1"]);
  });
});
