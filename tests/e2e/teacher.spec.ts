import { test as base, expect, type Page } from "@playwright/test";
import { db, ids, password } from "./data";
const test = base.extend<{ health: void }>({
  health: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => {
        if (!r.failure()?.errorText.includes("ERR_ABORTED"))
          errors.push(r.failure()?.errorText || "Falha de transporte");
      });
      page.on("response", (r) => {
        if (
          r.status() >= 400 &&
          !(new URL(r.url()).pathname === "/api/auth/me" && r.status() === 401)
        )
          errors.push(`${new URL(r.url()).pathname}: ${r.status()}`);
      });
      await use();
      expect(errors).toEqual([]);
    },
    { auto: true },
  ],
});
async function login(page: Page, project: string, role = "teacher") {
  await page.goto("/");
  await page.getByLabel("E-mail Institucional").fill(ids(project).email(role));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByRole("heading", { name: "Painel do Professor" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Painel do Professor" }),
  ).toBeVisible();
}
test.afterAll(async () => {
  await db.$disconnect();
});
test("Marco 8: gestão real do professor, indicadores, diário, presenças e alunos", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name);
  const nav = page.getByRole("navigation", { name: "Área do professor" });
  for (const name of [
    "Visão Geral",
    "Minhas Turmas",
    "Aulas e Diário",
    "Presenças",
    "Alunos",
  ])
    await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(
    page.getByText("Próxima aula Marco 8", { exact: true }).first(),
  ).toBeVisible();
  const initial = await page.request.get("/api/teacher/dashboard");
  expect(initial.status()).toBe(200);
  const before = await initial.json();
  expect(before.classes.map((c: { id: string }) => c.id)).toEqual([f.class]);
  expect(before.pendingAttendances.length).toBe(2);
  expect(before.upcomingLesson.id).toBe(f.futureLesson);
  await nav.getByRole("button", { name: "Minhas Turmas", exact: true }).click();
  const card = page.getByTestId(`class-${f.class}`);
  await expect(card).toBeVisible();
  await expect(
    page.getByText("Turma E2E Privada", { exact: true }),
  ).toHaveCount(0);
  await card
    .getByRole("button", { name: "Turma E2E Java", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Cronograma", exact: true }),
  ).toBeVisible();
  await card.getByRole("button", { name: /Diário de Aulas/ }).click();
  await page
    .getByTestId(`lesson-${f.m8Lesson}`)
    .getByRole("button", { name: "Editar Diário", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Novo tópico planejado").fill("Planejamento Marco 8");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await dialog.getByRole("button", { name: /Tópicos Ministrados/ }).click();
  await dialog.getByLabel("Novo tópico ministrado").fill("Conteúdo Marco 8");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await dialog.getByRole("button", { name: /Materiais de Apoio/ }).click();
  await dialog.getByLabel("Título do Material").fill("Referência Marco 8");
  await dialog
    .getByLabel("URL (http:// ou https://)")
    .fill("https://www.typescriptlang.org/docs/");
  await dialog.getByRole("button", { name: "Adicionar Link" }).click();
  const saved = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/lessons/${f.m8Lesson}`) &&
      r.request().method() === "PUT",
  );
  await dialog
    .getByRole("button", { name: "Salvar Alterações do Diário" })
    .click();
  expect((await saved).status()).toBe(200);
  await expect(
    dialog.getByText("Diário de aula salvo com sucesso no banco de dados!", {
      exact: true,
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await expect
    .poll(async () => {
      const r = await page.request.get("/api/teacher/dashboard");
      return (await r.json()).indicators.diaries;
    })
    .toBe(before.indicators.diaries + 1);
  await page.reload();
  await nav
    .getByRole("button", { name: "Aulas e Diário", exact: true })
    .click();
  await page
    .getByTestId(`lesson-${f.m8Lesson}`)
    .getByRole("button", { name: "Editar Diário", exact: true })
    .click();
  await dialog.getByRole("button", { name: /Tópicos Ministrados/ }).click();
  await expect(
    dialog.getByText("Conteúdo Marco 8", { exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole("button", { name: "Editar tópico", exact: true })
    .click();
  await dialog
    .getByLabel("Editar tópico ministrado")
    .fill("Conteúdo Marco 8 revisado");
  await dialog.getByRole("button", { name: "Salvar alteração" }).click();
  const updated = page.waitForResponse(
    (r) =>
      r.url().includes(`/api/lessons/${f.m8Lesson}`) &&
      r.request().method() === "PUT",
  );
  await dialog
    .getByRole("button", { name: "Salvar Alterações do Diário" })
    .click();
  expect((await updated).status()).toBe(200);
  await expect(
    dialog.getByText("Diário de aula salvo com sucesso no banco de dados!", {
      exact: true,
    }),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar", exact: true }).click();
  await nav.getByRole("button", { name: "Presenças", exact: true }).click();
  await page.getByLabel("Filtrar por turma").selectOption(f.class);
  await page.getByLabel("Filtrar por aula").selectOption(f.m8Lesson);
  const attendance = page.getByTestId(`attendance-${f.attendance}`);
  await expect(attendance).toBeVisible();
  const confirmed = page.waitForResponse((r) =>
    r.url().endsWith("/api/teacher/attendance/confirm"),
  );
  await attendance
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  expect((await confirmed).status()).toBe(200);
  await expect(attendance).toHaveCount(0);
  await page.getByLabel("Filtrar por aula").selectOption(f.emptyLesson);
  const rejected = page.waitForResponse((r) =>
    r.url().endsWith("/api/teacher/attendance/reject"),
  );
  await page
    .getByTestId(`attendance-${f.rejection}`)
    .getByRole("button", { name: "Rejeitar", exact: true })
    .click();
  expect((await rejected).status()).toBe(200);
  await expect(
    page.getByText("Nenhuma presença pendente.", { exact: true }),
  ).toBeVisible();
  await page.getByLabel("Filtrar por aula").selectOption("");
  await page.getByRole("button", { name: "Resolvidas", exact: true }).click();
  await expect(
    page
      .getByTestId(`attendance-${f.attendance}`)
      .getByText("Confirmada", { exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByTestId(`attendance-${f.rejection}`)
      .getByText("Solicitação rejeitada", { exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Alunos", exact: true }).click();
  await expect(
    page.getByText(`Teste student ${info.project.name} · Ativa`, {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText("1 presenças · 1 ausências registradas · 0 pendências", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.getByText(/Frequência: 50%/)).toBeVisible();
  await nav.getByRole("button", { name: "Visão Geral", exact: true }).click();
  const after = await (await page.request.get("/api/teacher/dashboard")).json();
  expect(after.pendingAttendances.length).toBe(0);
  const record = await db.lesson.findUniqueOrThrow({
    where: { id: f.m8Lesson },
    include: { contents: true },
  });
  expect(record.contents.find((t) => t.contentType === "TAUGHT")?.title).toBe(
    "Conteúdo Marco 8 revisado",
  );
  const student = await db.student.findUniqueOrThrow({
    where: { id: `${f.student}_profile` },
    include: { pointTransactions: true, coinTransactions: true },
  });
  expect(
    student.pointTransactions.filter((t) => t.originReference === f.m8Lesson),
  ).toHaveLength(1);
  expect(
    student.coinTransactions.filter((t) => t.originReference === f.m8Lesson),
  ).toHaveLength(1);
  expect(
    student.pointTransactions.filter(
      (t) => t.originReference === f.emptyLesson,
    ),
  ).toHaveLength(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  const path = info.outputPath(`teacher-marco8-${info.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach("Painel Marco 8", { path, contentType: "image/png" });
});
test("Marco 8: API docente recusa aluno e professor de outra turma", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name, "otherTeacher");
  for (const path of [
    `/api/lessons/${f.lesson}`,
    `/api/classes/${f.class}/lessons`,
    `/api/admin/student-attendance?studentId=${f.student}_profile`,
  ])
    expect((await page.request.get(path)).status()).toBe(403);
  for (const action of ["confirm", "reject"])
    expect(
      (
        await page.request.post(`/api/teacher/attendance/${action}`, {
          data: { attendanceId: f.attendance },
        })
      ).status(),
    ).toBe(403);
  await page.request.post("/api/auth/logout");
  await page.goto("/");
  await page.getByLabel("E-mail Institucional").fill(f.email("student"));
  await page.getByLabel("Senha de Acesso").fill(password);
  const auth = page.waitForResponse((r) => r.url().endsWith("/api/auth/login"));
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await auth).status()).toBe(200);
  expect((await page.request.get("/api/teacher/dashboard")).status()).toBe(403);
  for (const action of ["confirm", "reject"])
    expect(
      (
        await page.request.post(`/api/teacher/attendance/${action}`, {
          data: { attendanceId: f.attendance },
        })
      ).status(),
    ).toBe(403);
});
