import { test, expect } from "@playwright/test";
import { db, ids, password } from "./data";
import { pendingRegistrationMessage } from "../../lib/registration-input";
import { createSessionToken } from "../../lib/session-token";
const baseURL = "http://127.0.0.1:3100";
async function signup(
  page: import("@playwright/test").Page,
  email: string,
  name: string,
  course: string,
) {
  await page.goto("/cadastro");
  await page.getByLabel("Nome", { exact: true }).fill(name);
  await page.getByLabel("Curso", { exact: true }).selectOption(course);
  await page.getByLabel("E-mail", { exact: true }).fill(email);
  await page.getByLabel("Senha", { exact: true }).fill("senha123");
  await page.getByRole("button", { name: "Enviar cadastro" }).click();
  await expect(page.getByRole("status")).toHaveText(pendingRegistrationMessage);
}
async function login(
  page: import("@playwright/test").Page,
  email: string,
  secret: string,
) {
  await page.request.post("/api/auth/logout", { headers: { Origin: baseURL } });
  await page.goto("/");
  await page.getByLabel("E-mail Institucional").fill(email);
  await page.getByLabel("Senha de Acesso").fill(secret);
  const result = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  return result;
}
test.afterAll(async () => {
  await db.$disconnect();
});
test("cadastro público, bloqueio pendente, aprovação e login real", async ({
  page,
  browser,
}, info) => {
  const f = ids(info.project.name);
  const email = `${f.prefix}_signup@example.test`;
  await page.goto("/");
  await page.getByRole("link", { name: "Criar minha conta de aluno" }).click();
  await expect(page).toHaveURL(/\/cadastro$/);
  await signup(page, email, "Aluno Cadastro", "JAVA");
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { registration: true },
  });
  expect(user.registration?.course).toBe("JAVA");
  expect(user.role).toBe("ALUNO");
  expect(await db.student.count({ where: { userId: user.id } })).toBe(0);
  expect((await login(page, email, "wrong123")).status()).toBe(401);
  expect((await login(page, email, "senha123")).status()).toBe(403);
  await expect(
    page.getByText(pendingRegistrationMessage, { exact: true }),
  ).toBeVisible();
  expect((await page.request.get("/api/auth/me")).status()).toBe(401);
  expect((await page.request.get("/api/director/registrations")).status()).toBe(
    401,
  );
  // Even a valid signed token cannot activate a pending account.
  const token = await createSessionToken({
    id: user.id,
    name: user.name,
    email,
    role: "ALUNO",
  });
  expect(
    (
      await page.request.get("/api/auth/me", {
        headers: { Cookie: `fuctura_session=${token}` },
      })
    ).status(),
  ).toBe(401);
  expect((await login(page, f.email("teacher"), password)).status()).toBe(200);
  expect((await page.request.get("/api/director/registrations")).status()).toBe(
    403,
  );
  expect(
    (
      await page.request.post("/api/director/registrations", {
        headers: { Origin: baseURL },
        data: { id: user.registration!.id, decision: "APPROVED" },
      })
    ).status(),
  ).toBe(403);
  expect((await login(page, f.email("director"), password)).status()).toBe(200);
  await page
    .getByRole("navigation", { name: "Áreas do diretor" })
    .getByRole("button", { name: "Alunos", exact: true })
    .click();
  const row = page.getByRole("listitem").filter({ hasText: email });
  await row.getByRole("button", { name: "Aprovar cadastro" }).click();
  await expect(
    page.getByText("Cadastro aprovado. O aluno já pode entrar."),
  ).toBeVisible();
  const student = await db.student.findUniqueOrThrow({
    where: { userId: user.id },
  });
  expect(student.currentXp).toBe(0);
  expect(student.coinBalance).toBe(0);
  expect(
    (
      await page.request.post("/api/director/registrations", {
        headers: { Origin: baseURL },
        data: { id: user.registration!.id, decision: "APPROVED" },
      })
    ).status(),
  ).toBe(200);
  expect(
    JSON.stringify(
      await (await page.request.get("/api/director/registrations")).json(),
    ),
  ).not.toMatch(/passwordHash|senha123/);
  const other = await browser.newContext();
  try {
    const studentPage = await other.newPage();
    expect((await login(studentPage, email, "senha123")).status()).toBe(200);
    expect(
      (await other.request.get("/api/director/registrations")).status(),
    ).toBe(403);
    expect((await other.request.get("/api/student/dashboard")).status()).toBe(
      200,
    );
    const xp = (
      await db.student.findUniqueOrThrow({ where: { id: student.id } })
    ).currentXp;
    expect((await login(studentPage, email, "senha123")).status()).toBe(200);
    expect(
      (await db.student.findUniqueOrThrow({ where: { id: student.id } }))
        .currentXp,
    ).toBe(xp);
  } finally {
    await other.close();
  }
});
test("cadastro rejeitado mantém mensagem pendente e não gera recompensa", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  const email = `${f.prefix}_signup_rejected@example.test`;
  await signup(page, email, "Cadastro Rejeitado", "IA");
  expect((await login(page, f.email("director"), password)).status()).toBe(200);
  await page
    .getByRole("navigation", { name: "Áreas do diretor" })
    .getByRole("button", { name: "Alunos", exact: true })
    .click();
  await page
    .getByRole("listitem")
    .filter({ hasText: email })
    .getByRole("button", { name: "Rejeitar cadastro" })
    .click();
  await expect(
    page.getByText("Cadastro rejeitado. O acesso permanece bloqueado."),
  ).toBeVisible();
  expect((await login(page, email, "senha123")).status()).toBe(403);
  await expect(
    page.getByText(pendingRegistrationMessage, { exact: true }),
  ).toBeVisible();
  const user = await db.user.findUniqueOrThrow({
    where: { email },
    include: { registration: true },
  });
  expect(user.registration?.status).toBe("REJECTED");
  expect(await db.student.count({ where: { userId: user.id } })).toBe(0);
});
