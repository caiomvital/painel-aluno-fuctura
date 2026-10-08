import { test as base, expect, type Page } from "@playwright/test";
import { db, ids, password } from "./data";
const test = base.extend<{ health: void }>({
  health: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("requestfailed", (r) => {
        if (!r.failure()?.errorText.includes("ERR_ABORTED"))
          errors.push(r.failure()?.errorText ?? "Falha de transporte");
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
async function login(page: Page, project: string, role = "director") {
  await page.goto("/");
  await page.getByLabel("E-mail Institucional").fill(ids(project).email(role));
  await page.getByLabel("Senha de Acesso").fill(password);
  const response = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/auth/login") && r.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await response).status()).toBe(200);
  if (role === "director")
    await expect(
      page.getByRole("navigation", { name: "Áreas do diretor" }),
    ).toBeVisible();
}
async function saveForm(page: Page) {
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Salvar cadastro" }).click();
  await expect(dialog).toHaveCount(0);
}
test.afterAll(async () => {
  await db.$disconnect();
});
test("Marco 9: gestão administrativa real, seis áreas, busca, matrícula, diário e presenças", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name);
  const nav = page.getByRole("navigation", { name: "Áreas do diretor" });
  for (const name of [
    "Visão Geral",
    "Turmas",
    "Professores",
    "Alunos",
    "Aulas e Presenças",
    "Gamificação e Leilões",
  ])
    await expect(nav.getByRole("button", { name, exact: true })).toBeVisible();
  const initial = await (
    await page.request.get("/api/director/dashboard")
  ).json();
  expect(
    initial.pendingDiaries.some((l: { id: string }) => l.id === f.m9Lesson),
  ).toBe(true);
  expect(JSON.stringify(initial)).not.toContain("passwordHash");
  await page.screenshot({
    path: info.outputPath("director-overview.png"),
    fullPage: true,
  });
  await nav.getByRole("button", { name: "Turmas", exact: true }).click();
  await page.getByRole("button", { name: "Nova Turma", exact: true }).click();
  let dialog = page.getByRole("dialog");
  const className = `Turma Marco 9 ${info.project.name}`;
  await dialog.getByLabel("Nome", { exact: true }).fill(className);
  await dialog.getByLabel("Código", { exact: true }).fill(`${f.prefix}_M9`);
  await dialog.getByLabel("Curso", { exact: true }).selectOption(f.course);
  await dialog.getByLabel("Dias da semana").fill("SEG");
  await dialog.getByLabel("Horário", { exact: true }).fill("09:00 - 10:30");
  await dialog.getByLabel("Data inicial").fill("2026-01-01");
  await saveForm(page);
  let created = await db.class.findUniqueOrThrow({
    where: { code: `${f.prefix}_M9`.toUpperCase() },
  });
  let card = page.getByTestId(`class-${created.id}`);
  await card.getByRole("button", { name: "Editar turma" }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill(`${className} editada`);
  await saveForm(page);
  await expect(
    card.getByRole("button", { name: `${className} editada`, exact: true }),
  ).toBeVisible();
  await nav.getByRole("button", { name: "Professores", exact: true }).click();
  await page
    .getByRole("button", { name: "Cadastrar professor", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  const teacherName = `Professor Marco 9 ${info.project.name}`;
  await dialog.getByLabel("Nome", { exact: true }).fill(teacherName);
  await dialog
    .getByLabel("E-mail", { exact: true })
    .fill(`${f.prefix}_newteacher@example.test`);
  await dialog.getByLabel("Especialidade").fill("Java");
  await saveForm(page);
  await page.getByLabel("Buscar professor").fill(teacherName);
  await page.getByRole("button", { name: teacherName, exact: true }).click();
  await page.getByLabel("Atribuir turma").selectOption(created.id);
  await page
    .getByRole("button", { name: "Atribuir professor", exact: true })
    .click();
  await expect(
    page.getByRole("button", {
      name: `Remover responsabilidade de ${className} editada`,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar professor", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Especialidade")
    .fill("Java e PostgreSQL");
  await saveForm(page);
  await expect(page.getByText(/Java e PostgreSQL/)).toBeVisible();
  await page
    .getByRole("button", { name: "Consultar cronograma do professor" })
    .click();
  await expect(page.getByLabel("Filtrar por professor")).not.toHaveValue("");
  await expect(page.getByText("Nenhuma aula neste filtro.")).toBeVisible();
  await nav.getByRole("button", { name: "Alunos", exact: true }).click();
  await page
    .getByRole("button", { name: "Cadastrar aluno", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  const studentName = `Aluno Marco 9 ${info.project.name}`;
  await dialog.getByLabel("Nome", { exact: true }).fill(studentName);
  await dialog
    .getByLabel("E-mail", { exact: true })
    .fill(`${f.prefix}_newstudent@example.test`);
  await dialog.getByLabel("Número da matrícula").fill(`${f.prefix}_newstudent`);
  await saveForm(page);
  await page.getByLabel("Buscar aluno por nome").fill(studentName);
  await page.getByRole("button", { name: studentName, exact: true }).click();
  await page.getByLabel("Turma para matrícula").selectOption(created.id);
  await page
    .getByRole("button", { name: "Matricular aluno", exact: true })
    .click();
  await expect(page.getByLabel(`Situação em ${className} editada`)).toHaveValue(
    "ACTIVE",
  );
  const newStudent = await db.student.findUniqueOrThrow({
    where: { registrationNumber: `${f.prefix}_newstudent` },
  });
  const before = await db.student.findUniqueOrThrow({
    where: { id: newStudent.id },
  });
  const duplicate = await page.request.post("/api/director/enrollments", {
    data: { studentId: newStudent.id, classId: created.id },
  });
  expect(duplicate.status()).toBe(409);
  await page.getByRole("button", { name: "Editar aluno", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Nome", { exact: true })
    .fill(`${studentName} editado`);
  await saveForm(page);
  await page.getByLabel("Filtrar por turma").selectOption(created.id);
  await page
    .getByLabel("Situação da matrícula", { exact: true })
    .selectOption("ACTIVE");
  await expect(page.getByTestId(`student-${newStudent.id}`)).toBeVisible();
  expect(
    (await db.student.findUniqueOrThrow({ where: { id: newStudent.id } }))
      .currentXp,
  ).toBe(before.currentXp);
  expect(
    await db.coinTransaction.count({ where: { studentId: newStudent.id } }),
  ).toBe(0);
  await nav.getByRole("button", { name: "Turmas", exact: true }).click();
  await page
    .getByTestId(`class-${created.id}`)
    .getByRole("button", { name: /Diário de Aulas/ })
    .click();
  await expect(page.getByText("Turma sem aulas cadastradas.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: `${studentName} editado • Ativa` }),
  ).toBeVisible();
  await nav
    .getByRole("button", { name: "Aulas e Presenças", exact: true })
    .click();
  await page.getByLabel("Filtrar por turma").selectOption(f.otherClass);
  await page.getByLabel("Aula", { exact: true }).selectOption(f.m9Lesson);
  await page
    .getByTestId(`lesson-${f.m9Lesson}`)
    .getByRole("button", { name: "Inspecionar / Editar Diário" })
    .click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Novo tópico planejado")
    .fill("Planejamento da direção");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await dialog.getByRole("button", { name: /Tópicos Ministrados/ }).click();
  await dialog.getByLabel("Novo tópico ministrado").fill("Conteúdo da direção");
  await dialog.getByRole("button", { name: "Adicionar", exact: true }).click();
  await dialog
    .getByRole("button", { name: "Salvar Alterações do Diário" })
    .click();
  await expect(
    dialog.getByText(/Diário de aula salvo com sucesso/),
  ).toBeVisible();
  await dialog.getByRole("button", { name: "Fechar diário" }).click();
  const pending = page.getByTestId(`attendance-${f.m9Attendance}`);
  await pending.getByRole("button", { name: "Confirmar presença" }).click();
  await expect(pending).toHaveCount(0);
  await page.getByLabel("Aula", { exact: true }).selectOption(f.m9RejectLesson);
  const rejected = page.getByTestId(`attendance-${f.m9Rejection}`);
  await rejected.getByRole("button", { name: "Rejeitar presença" }).click();
  await expect(rejected).toHaveCount(0);
  await page.getByLabel("Solicitações de presença").selectOption("RESOLVED");
  await expect(page.getByTestId(`attendance-${f.m9Rejection}`)).toContainText(
    "Falta registrada",
  );
  await page.getByLabel("Período inicial").fill("2026-01-01");
  await page.getByLabel("Período final").fill("2026-01-31");
  await page.getByLabel("Aula", { exact: true }).selectOption("");
  await page.getByLabel("Situação do diário").selectOption("FILLED");
  await expect(page.getByTestId(`lesson-${f.m9Lesson}`)).toBeVisible();
  await expect(page.getByTestId(`lesson-${f.m9RejectLesson}`)).toHaveCount(0);
  await nav.getByRole("button", { name: "Visão Geral", exact: true }).click();
  const after = await (
    await page.request.get("/api/director/dashboard")
  ).json();
  expect(after.metrics.pendingAttendances).toBe(
    initial.metrics.pendingAttendances - 2,
  );
  expect(
    after.pendingDiaries.some((l: { id: string }) => l.id === f.m9Lesson),
  ).toBe(false);
  const points = await db.pointTransaction.findMany({
    where: { studentId: `${f.outsider}_profile`, originReference: f.m9Lesson },
  });
  const coins = await db.coinTransaction.findMany({
    where: { studentId: `${f.outsider}_profile`, originReference: f.m9Lesson },
  });
  expect(points).toHaveLength(1);
  expect(coins).toHaveLength(1);
  expect(points[0].amount).toBe(coins[0].amount);
  expect(
    await db.coinTransaction.count({
      where: { originReference: f.m9RejectLesson },
    }),
  ).toBe(0);
  await nav
    .getByRole("button", { name: "Gamificação e Leilões", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Ajustes manuais de XP e Coins" }),
  ).toBeVisible();
  await expect(
    page.getByText("Item E2E", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Regras de XP", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Valores de Recompensa em XP" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("director-finance.png"),
    fullPage: true,
  });
  await page.reload();
  await expect(
    page.getByRole("navigation", { name: "Áreas do diretor" }),
  ).toBeVisible();
  expect(
    (
      await db.enrollment.findUniqueOrThrow({
        where: {
          studentId_classId: { studentId: newStudent.id, classId: created.id },
        },
      })
    ).status,
  ).toBe("ACTIVE");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
test("Marco 9: endpoints administrativos bloqueiam professor, aluno e sessão ausente", async ({
  page,
}, info) => {
  const paths = [
    "dashboard",
    "classes",
    "teachers",
    "students",
    "enrollments",
    "attendance",
    "coins",
    "auction",
  ];
  for (const path of ["dashboard", "teachers", "students", "coins", "auction"])
    expect(
      (await page.request.get(`/api/director/${path}`)).status(),
    ).toBeGreaterThanOrEqual(401);
  for (const role of ["teacher", "student"]) {
    await login(page, info.project.name, role);
    for (const path of paths) {
      const response =
        path === "dashboard"
          ? await page.request.get(`/api/director/${path}`)
          : await page.request.post(`/api/director/${path}`, { data: {} });
      expect(response.status(), `${role} POST/GET ${path}`).toBe(403);
      if (
        ["classes", "teachers", "students", "enrollments", "auction"].includes(
          path,
        )
      )
        expect(
          (
            await page.request.put(`/api/director/${path}`, { data: {} })
          ).status(),
        ).toBe(403);
      if (["classes", "teachers", "students", "auction"].includes(path))
        expect(
          (
            await page.request.delete(`/api/director/${path}?id=invalid`)
          ).status(),
        ).toBe(403);
      if (["teachers", "students", "coins", "auction"].includes(path))
        expect((await page.request.get(`/api/director/${path}`)).status()).toBe(
          403,
        );
    }
    await page.context().clearCookies();
  }
});

test("Marco 9: controles existentes de XP, Coins e lotes persistem e mantêm ledgers", async ({
  page,
}, info) => {
  const f = ids(info.project.name);
  await login(page, info.project.name);
  await page
    .getByRole("navigation", { name: "Áreas do diretor" })
    .getByRole("button", { name: "Gamificação e Leilões", exact: true })
    .click();
  const studentId = `${f.outsider}_profile`;
  const before = await db.student.findUniqueOrThrow({
    where: { id: studentId },
  });
  await page.getByLabel("Aluno para ajuste").selectOption(studentId);
  await page.getByLabel("Novo total de XP").fill(String(before.currentXp + 7));
  await page
    .getByRole("button", { name: "Registrar ajuste", exact: true })
    .click();
  await expect(
    page.getByText("Ajuste registrado no ledger.", { exact: true }),
  ).toBeVisible();
  let updated = await db.student.findUniqueOrThrow({
    where: { id: studentId },
  });
  expect(updated.currentXp).toBe(before.currentXp + 7);
  expect(updated.coinBalance).toBe(before.coinBalance);
  expect(
    await db.pointTransaction.count({
      where: { studentId, type: "MANUAL", amount: 7 },
    }),
  ).toBe(1);
  await page.getByLabel("Tipo de ajuste").selectOption("Coins");
  await page.getByLabel("Variação de Coins").fill("11");
  await page.getByLabel("Descrição do ajuste").fill("Ajuste E2E Marco 9");
  const coinsResponse = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/director/coins") &&
      r.request().method() === "POST",
  );
  await page
    .getByRole("button", { name: "Registrar ajuste", exact: true })
    .click();
  expect((await coinsResponse).status()).toBe(200);
  updated = await db.student.findUniqueOrThrow({ where: { id: studentId } });
  expect(updated.coinBalance).toBe(before.coinBalance + 11);
  expect(updated.currentXp).toBe(before.currentXp + 7);
  expect(
    await db.coinTransaction.count({
      where: {
        studentId,
        type: "MANUAL",
        description: "Ajuste E2E Marco 9",
        amount: 11,
      },
    }),
  ).toBe(1);
  await page
    .getByRole("button", { name: "Incluir Novo Item no Leilão", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  const title = `Lote Marco 9 ${f.prefix}`;
  await dialog.getByLabel("Título do Prêmio / Lote").fill(title);
  await dialog
    .getByLabel("Descrição Detalhada do Item")
    .fill("Lote criado pela direção no banco isolado");
  await dialog.getByRole("button", { name: "Cadastrar no Leilão" }).click();
  await expect(dialog).toHaveCount(0);
  const item = await db.auctionItem.findFirstOrThrow({ where: { title } });
  const card = page.getByTestId(`auction-${item.id}`);
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Editar Lote / Datas" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Descrição Detalhada do Item")
    .fill("Descrição revisada pela direção");
  await expect(
    dialog.getByLabel("Lance Mínimo Inicial (Coins)"),
  ).toBeDisabled();
  await dialog
    .getByRole("button", { name: "Salvar Alterações", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toContainText("Descrição revisada pela direção");
  page.once("dialog", (d) => d.accept());
  await card
    .getByRole("button", { name: "Encerrar lote", exact: true })
    .click();
  await expect(
    card.getByRole("button", { name: "Encerrar lote", exact: true }),
  ).toBeDisabled();
  expect(
    (await db.auctionItem.findUniqueOrThrow({ where: { id: item.id } })).status,
  ).toBe("FINISHED");
  const after = await db.student.findUniqueOrThrow({
    where: { id: studentId },
  });
  expect(after.currentXp).toBe(updated.currentXp);
  expect(after.coinBalance).toBe(updated.coinBalance);
});
