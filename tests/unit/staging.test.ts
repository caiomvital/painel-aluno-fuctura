import { test, expect, describe } from "bun:test";
import { createHash } from "node:crypto";
import {
  approveStagingTarget,
  fictionalAccountPassword,
  requireProvisioningMaintenance,
  targetFingerprint,
  type StagingApproval,
} from "../../lib/staging-target";
import { stagingIndexHeaders } from "../../lib/staging-index";
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
const env = {
  APP_ENV: "staging",
  APP_URL: "https://staging.example.test",
  AUTH_SECRET: "test-only-independent-staging-secret-value",
  DATABASE_URL: "postgresql://test:local@127.0.0.1:5432/fuctura_test",
  DIRECT_URL: "postgresql://test:local@127.0.0.1:5432/fuctura_test",
};
const approval: StagingApproval = {
  version: 1,
  environment: "staging",
  isolated: true,
  shared: false,
  targetSha256: targetFingerprint(env.DATABASE_URL),
  origin: env.APP_URL,
  protectedTargets: [hash("protected-database")],
  protectedOrigins: ["https://production.example.test"],
  protectedAuthSecrets: [hash("test-only-production-secret-value")],
};
describe("Etapa 2A: guardas de homologação sem conectar ou criar dados", () => {
  test("aceita somente alvo isolado e confirmação exata", () => {
    const result = approveStagingTarget(env, approval);
    expect(result.target).toBe(approval.targetSha256);
    expect(
      approveStagingTarget(env, approval, result.confirmation).target,
    ).toBe(result.target);
  });
  test("recusa ambiente de produção mesmo com arquivo de aprovação", () => {
    expect(() =>
      approveStagingTarget({ ...env, APP_ENV: "production" }, approval),
    ).toThrow();
    expect(() =>
      approveStagingTarget({ ...env, APP_ENV: undefined }, approval),
    ).toThrow();
  });
  test("recusa banco compartilhado ou isolamento não confirmado", () => {
    for (const a of [
      { ...approval, shared: true },
      { ...approval, isolated: false },
      { ...approval, environment: "production" },
    ])
      expect(() => approveStagingTarget(env, a)).toThrow();
  });
  test("recusa destinos protegidos e divergência entre conexões", () => {
    expect(() =>
      approveStagingTarget(env, {
        ...approval,
        protectedTargets: [approval.targetSha256],
      }),
    ).toThrow();
    expect(() =>
      approveStagingTarget(
        {
          ...env,
          DIRECT_URL: env.DIRECT_URL.replace("fuctura_test", "other_test"),
        },
        approval,
      ),
    ).toThrow();
  });
  test("recusa confirmação errada e manifesto sem inventário protegido", () => {
    expect(() =>
      approveStagingTarget(env, approval, "CREATE_FICTIONAL_DATA:wrong"),
    ).toThrow();
    for (const key of [
      "protectedTargets",
      "protectedOrigins",
      "protectedAuthSecrets",
    ])
      expect(() =>
        approveStagingTarget(env, { ...approval, [key]: [] }),
      ).toThrow();
    expect(() =>
      approveStagingTarget(env, { ...approval, targetSha256: "REPLACE_HASH" }),
    ).toThrow();
  });
  test("recusa origem ou segredo compartilhados com produção", () => {
    expect(() =>
      approveStagingTarget(env, {
        ...approval,
        protectedOrigins: [env.APP_URL],
      }),
    ).toThrow();
    expect(() =>
      approveStagingTarget(env, {
        ...approval,
        protectedAuthSecrets: [hash(env.AUTH_SECRET)],
      }),
    ).toThrow();
    expect(() =>
      approveStagingTarget(env, {
        ...approval,
        origin: "https://other.example.test",
      }),
    ).toThrow();
  });
  test("identidade não depende da senha mas diferencia projeto Supabase no mesmo pooler", () => {
    const ref = "a".repeat(20),
      pool = `postgresql://postgres.${ref}:example@aws-0-sa-east-1.pooler.supabase.com:6543/postgres`,
      direct = `postgresql://postgres:another@db.${ref}.supabase.co:5432/postgres`;
    expect(targetFingerprint(pool)).toBe(targetFingerprint(direct));
    expect(targetFingerprint(pool.replace(ref, "b".repeat(20)))).not.toBe(
      targetFingerprint(pool),
    );
    expect(targetFingerprint(pool)).not.toContain(ref);
  });
  test("recusa schemas alternativos, host sobrescrito e banco local comum", () => {
    for (const url of [
      env.DATABASE_URL + "?schema=staging",
      env.DATABASE_URL + "?host=remote",
      env.DATABASE_URL.replace("fuctura_test", "postgres"),
      "postgresql://test:local@unknown.example.test/fuctura_test",
    ])
      expect(() => targetFingerprint(url)).toThrow();
  });
  test("validadores nunca retornam URL com credenciais em erro", () => {
    const sentinel =
      "postgresql://user:SENTINEL_SECRET@unknown.example.test/postgres";
    try {
      targetFingerprint(sentinel);
      throw new Error("expected failure");
    } catch (e) {
      expect(String(e)).not.toContain("SENTINEL_SECRET");
    }
  });
  test("senha fictícia recusa placeholder, padrão público, segredo JWT e excesso bcrypt", () => {
    for (const value of [
      undefined,
      "short",
      "REPLACE_PUBLIC_PLACEHOLDER",
      "Password123!",
      "a".repeat(73),
      env.AUTH_SECRET,
    ])
      expect(() => fictionalAccountPassword(value, env.AUTH_SECRET)).toThrow();
    expect(
      fictionalAccountPassword("Fictional-test-only-789!", env.AUTH_SECRET),
    ).toBe("Fictional-test-only-789!");
  });
  test("provisionamento exige confirmação de manutenção sem executar mecanismo", () => {
    for (const value of [undefined, "0", "true", "production"])
      expect(() => requireProvisioningMaintenance(value)).toThrow();
    expect(() => requireProvisioningMaintenance("1")).not.toThrow();
  });
  test("anti-indexação é própria de staging e não oferece autenticação", () => {
    expect(stagingIndexHeaders("staging")).toEqual({
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "X-Fuctura-Environment": "staging",
    });
    expect(stagingIndexHeaders("production")).toEqual({});
    expect(stagingIndexHeaders(undefined)).toEqual({});
  });
});
