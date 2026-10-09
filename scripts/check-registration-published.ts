// Separate from the disposable-database suite: no fixtures, migrations or cleanup.
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { chromium, devices, expect, type Page } from "@playwright/test";
import { approveStagingTarget, targetFingerprint } from "../lib/staging-target";
import { productionConfiguration } from "../lib/production-config";
import { pendingRegistrationMessage, registrationInput } from "../lib/registration-input";

const origin = "https://fuctura-hml.69.169.102.111.sslip.io";
const args = process.argv.slice(2);
const mobile = args.includes("--mobile");
const contextOptions = { baseURL: origin, ...(mobile
  ? { ...devices["Pixel 5"], viewport: { width: 390, height: 844 } }
  : { viewport: { width: 1440, height: 900 } }) };
let stage = "configuração";
async function run() {
  if (args.some(a => a !== "--plan" && a !== "--apply" && a !== "--mobile" && !a.startsWith("--confirm=")) ||
      (args.includes("--plan") && args.includes("--apply"))) throw new Error("Argumentos recusados.");
  if (!args.includes("--apply")) {
    console.log(JSON.stringify({ mode: "plan", device: mobile ? "mobile" : "desktop", origin, writes: false,
      accounts: 3, approvals: ["ALUNO", "PROFESSOR"], rejections: 1,
      effects: ["User/Profile/RegistrationRequest", "Student/Streak", "Teacher",
        "revisão de solicitações", "possível XP/Coins/ledgers no login de aluno"],
      cleanup: false, authentication: false }));
    return;
  }
  const confirmation = args.find(a => a.startsWith("--confirm="))?.slice(10);
  // A specific authorization for the known published target does not require
  // declaring this populated database disposable or fabricating a protected inventory.
  productionConfiguration(process.env);
  const target = process.env.HOMOLOGATION_APPROVAL_FILE
    ? approveStagingTarget(process.env, JSON.parse(readFileSync(process.env.HOMOLOGATION_APPROVAL_FILE, "utf8")))
    : { origin: process.env.APP_URL, target: targetFingerprint(process.env.DATABASE_URL!) };
  if (process.env.APP_ENV !== "staging" ||
      target.target !== "689c60925ff3bf1915ddbeae49d85a82ce41d0143b2d1f0c109f7b358ba60d12" ||
      targetFingerprint(process.env.DIRECT_URL!) !== target.target)
    throw new Error("Somente o alvo específico autorizado nesta homologação é permitido.");
  if (target.origin !== origin || confirmation !== `TEST_REGISTRATION:${target.target}`)
    throw new Error("Origem e autorização específica de cadastro obrigatórias.");
  const session = process.env.STAGING_DIRECTOR_SESSION;
  const password = process.env.HOMOLOGATION_REGISTRATION_PASSWORD;
  if (!session || !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(session))
    throw new Error("Sessão de diretor obrigatória; não será criado outro diretor.");
  registrationInput({ name: "Homologação", email: "check@example.test", course: "JAVA", password });
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0") throw new Error("TLS estrito obrigatório.");
  stage = "inicialização do browser";
  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const { PrismaClient } = await import("@prisma/client");
  const { databaseUrl } = await import("../lib/database-config");
  const db = new PrismaClient({ datasources: { db: { url: databaseUrl(process.env.DIRECT_URL!) } }, log: [] });
  const runId = `hmlcad-${randomUUID()}`;
  const accounts: string[] = [];
  const checks: string[] = [];
  try {
    stage = "conferência do alvo publicado";
    const director = await browser.newContext(contextOptions);
    await director.addCookies([{ name: "fuctura_session", value: session, url: origin,
      secure: true, httpOnly: true, sameSite: "Lax" }]);
    const details = await director.request.get("/api/health/details", { maxRedirects: 0 });
    expect(details.status()).toBe(200);
    const actual = await details.json();
    expect(actual.stagingTarget).toBe(target.target);
    expect(actual.stagingDirectTarget).toBe(target.target);
    checks.push("alvo publicado confere com runtime/direct autorizados");
    // All SQL inspections explicitly run READ ONLY and select only this run's accounts.
    async function inspect(email: string) {
      return db.$transaction(async tx => {
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        return tx.user.findUnique({ where: { email }, select: {
          id: true, role: true, registration: { select: { id: true, status: true } },
          student: { select: { id: true, currentXp: true, coinBalance: true,
            _count: { select: { enrollments: true } } } }, teacher: { select: { id: true } },
          director: { select: { id: true } },
        } });
      });
    }
    async function login(page: Page, email: string, secret: string) {
      await page.goto("/");
      await page.getByLabel("E-mail Institucional").fill(email);
      await page.getByLabel("Senha de Acesso").fill(secret);
      const response = page.waitForResponse(r => r.url() === origin + "/api/auth/login" && r.request().method() === "POST");
      await page.getByRole("button", { name: "Entrar no Sistema" }).click();
      return response;
    }
    stage = "validação de senha longa";
    const context = await browser.newContext(contextOptions);
    const page = await context.newPage();
    const invalidEmail = `${runId}-long@example.test`;
    await page.goto("/cadastro");
    await page.getByLabel("Nome", { exact: true }).fill("Homologação Senha");
    await page.getByLabel("Curso", { exact: true }).selectOption("JAVA");
    await page.getByLabel("E-mail", { exact: true }).fill(invalidEmail);
    await page.getByLabel("Senha", { exact: true }).fill("abcdefg123");
    await expect(page.getByLabel("Senha", { exact: true })).toHaveValue("abcdefg123");
    await expect(page.locator("#password-length-error")).toHaveText("A senha pode ter no máximo 8 caracteres.");
    await expect(page.getByRole("button", { name: "Enviar cadastro" })).toBeDisabled();
    expect(await inspect(invalidEmail)).toBeNull();
    checks.push("senha longa preservada, aviso e envio bloqueado");
    await context.close();
    for (const [key, course, role] of [["student", "JAVA", "ALUNO"], ["teacher", "PYTHON", "PROFESSOR"], ["rejected", "IA", null]] as const) {
      stage = `cadastro e revisão: ${key}`;
      const email = `${runId}-${key}@example.test`;
      expect(await inspect(email)).toBeNull();
      accounts.push(email); // Preserve attempted identifiers even if the HTTP request fails.
      const userContext = await browser.newContext(contextOptions);
      const userPage = await userContext.newPage();
      await userPage.goto("/cadastro");
      await userPage.getByLabel("Nome", { exact: true }).fill(`Homologação ${key}`);
      await userPage.getByLabel("Curso", { exact: true }).selectOption(course);
      await userPage.getByLabel("E-mail", { exact: true }).fill(email);
      await userPage.getByLabel("Senha", { exact: true }).fill(password!);
      await userPage.getByRole("button", { name: "Enviar cadastro" }).click();
      await expect(userPage.getByRole("status")).toHaveText(pendingRegistrationMessage);
      expect((await login(userPage, email, "wrong123")).status()).toBe(401);
      expect((await login(userPage, email, password!)).status()).toBe(403);
      await expect(userPage.getByText(pendingRegistrationMessage, { exact: true })).toBeVisible();
      expect((await userContext.request.get("/api/auth/me")).status()).toBe(401);
      const pending = (await inspect(email))!;
      expect(pending.registration?.status).toBe("PENDING");
      expect(pending.student).toBeNull(); expect(pending.teacher).toBeNull(); expect(pending.director).toBeNull();
      const id = pending.registration!.id;
      const review = (decision: string, selectedRole?: string) => director.request.post("/api/director/registrations", {
        headers: { Origin: origin }, data: { id, decision, role: selectedRole }, maxRedirects: 0,
      });
      expect((await userContext.request.post("/api/director/registrations", {
        headers: { Origin: origin }, data: { id, decision: "APPROVED", role: "ALUNO" },
      })).status()).toBe(401);
      expect((await review("APPROVED", "DIRETOR")).status()).toBe(400);
      if (role) {
        const directorPage = await director.newPage();
        await directorPage.goto("/");
        await directorPage.getByRole("navigation", { name: "Áreas do diretor" }).getByRole("button", { name: "Alunos", exact: true }).click();
        const row = directorPage.getByRole("listitem").filter({ hasText: email });
        await expect(row.getByRole("button", { name: "Aprovar cadastro" })).toBeDisabled();
        await row.getByRole("combobox").selectOption(role);
        await row.getByRole("button", { name: "Aprovar cadastro" }).click();
        await expect(directorPage.getByText(role === "ALUNO" ? "Cadastro aprovado. O aluno já pode entrar." : "Cadastro aprovado. O professor já pode entrar.")).toBeVisible();
        await directorPage.close();
        expect((await review("APPROVED", role)).status()).toBe(200);
        expect((await review("APPROVED", role === "ALUNO" ? "PROFESSOR" : "ALUNO")).status()).toBe(409);
        const approved = (await inspect(email))!;
        expect(approved.role).toBe(role); expect(approved.director).toBeNull();
        if (role === "ALUNO") {
          expect(approved.teacher).toBeNull(); expect(approved.student?.currentXp).toBe(0);
          expect(approved.student?.coinBalance).toBe(0); expect(approved.student?._count.enrollments).toBe(0);
        } else { expect(approved.student).toBeNull(); expect(approved.teacher).not.toBeNull(); }
        const response = await login(userPage, email, password!);
        expect(response.status()).toBe(200); expect((await response.json()).user.role).toBe(role);
        expect((await userContext.request.get(role === "ALUNO" ? "/api/student/dashboard" : "/api/teacher/dashboard")).status()).toBe(200);
        expect((await userContext.request.get("/api/director/registrations")).status()).toBe(403);
        expect((await userContext.request.post("/api/director/registrations", {
          headers: { Origin: origin }, data: { id, decision: "APPROVED", role },
        })).status()).toBe(403);
      } else {
        expect((await review("REJECTED")).status()).toBe(200);
        expect((await login(userPage, email, password!)).status()).toBe(403);
        await expect(userPage.getByText(pendingRegistrationMessage, { exact: true })).toBeVisible();
        const rejected = (await inspect(email))!;
        expect(rejected.registration?.status).toBe("REJECTED");
        expect(rejected.student).toBeNull(); expect(rejected.teacher).toBeNull(); expect(rejected.director).toBeNull();
      }
      checks.push(key); await userContext.close();
    }
  } finally {
    await browser.close(); await db.$disconnect();
    console.log(JSON.stringify({ runId, device: mobile ? "mobile" : "desktop", viewport: contextOptions.viewport, target: target.target, accounts, checks, cleanup: false }));
  }
}
run().catch(() => { console.error(`Homologação de cadastro interrompida na etapa: ${stage}; revisar evidências e dados parciais. Nenhuma limpeza automática.`); process.exitCode = 1; });
