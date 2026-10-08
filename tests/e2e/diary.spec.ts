import {
  test as base,
  expect,
  type Page,
  type TestInfo,
} from "@playwright/test";
import { db, ids, password } from "./data";

const test = base.extend<{ browserHealth: void }>({
  browserHealth: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        if (
          message.location().url.includes("/api/auth/me") &&
          message.text().includes("401")
        )
          return;
        errors.push(message.text());
      });
      page.on("requestfailed", (request) => {
        // Navigation/React cancellation is expected; transport failures are not.
        if (!request.failure()?.errorText.includes("ERR_ABORTED"))
          errors.push(
            `${request.method()} ${new URL(request.url()).pathname}: ${request.failure()?.errorText}`,
          );
      });
      page.on("response", (response) => {
        const path = new URL(response.url()).pathname;
        const initialSession =
          path === "/api/auth/me" && response.status() === 401;
        if (response.status() >= 400 && !initialSession)
          errors.push(`${path}: HTTP ${response.status()}`);
      });
      await use();
      expect(errors, "Erros JS, HTTP ou transporte inesperados").toEqual([]);
    },
    { auto: true },
  ],
});
const planned = [
  "O que é herança",
  "A palavra extends",
  "Reutilização de atributos",
  "Sobrescrita de métodos",
  "Exercício prático",
];
const taught = [
  "Conceito de herança",
  "Uso de extends",
  "Exercício Pessoa e Aluno",
];

async function login(page: Page, role: string, project: string) {
  const f = ids(project);
  await page.goto("/");
  await page.getByLabel("E-mail Institucional").fill(f.email(role));
  await page.getByLabel("Senha de Acesso").fill(password);
  const authenticated = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/login") &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Entrar no Sistema" }).click();
  expect((await authenticated).status()).toBe(200);
  const dashboard = page.getByRole("button", {
    name:
      role === "director"
        ? /Turmas & Aulas/
        : ["teacher", "otherTeacher"].includes(role)
          ? "Minhas Turmas"
          : "Aulas & Cronograma",
  });
  await expect(dashboard).toBeVisible();
  // Validate the real session cookie, including after a reload.
  await page.reload();
  await expect(dashboard).toBeVisible();
  const session = await page.request.get("/api/auth/me");
  expect(session.status()).toBe(200);
  expect((await session.json()).user.id).toBe(f[role as "teacher"]);
}
async function openTeacher(page: Page, project: string) {
  const f = ids(project);
  await page.getByRole("button", { name: "Minhas Turmas" }).click();
  const card = page.getByTestId(`class-${f.class}`);
  await expect(card).toBeVisible();
  if (!(await card.getByRole("button", { name: /Diário de Aulas/ }).count()))
    await card.getByRole("heading", { name: "Turma E2E Java" }).click();
  await card.getByRole("button", { name: /Diário de Aulas/ }).click();
  await page
    .getByTestId(`lesson-${f.lesson}`)
    .getByRole("button", { name: "Editar Diário", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("dialog").getByRole("heading", { level: 2 }),
  ).toHaveText("Aula 1 — Herança em Java");
}
async function save(page: Page) {
  const response = page.waitForResponse(
    (response) =>
      response.url().includes("/api/lessons/") &&
      response.request().method() === "PUT",
  );
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Salvar Alterações do Diário" })
    .click();
  expect((await response).status()).toBe(200);
  await expect(
    page.getByText("Diário de aula salvo com sucesso no banco de dados!", {
      exact: true,
    }),
  ).toBeVisible();
}
async function screenshot(page: Page, info: TestInfo, role: string) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    )
    .toBe(true);
  const path = info.outputPath(`${role}-${info.project.name}.png`);
  await page.screenshot({ path, fullPage: true });
  await info.attach(`${role}-${info.project.name}`, {
    path,
    contentType: "image/png",
  });
}
async function readDiary(project: string) {
  return db.lesson.findUniqueOrThrow({
    where: { id: ids(project).lesson },
    include: { contents: true },
  });
}

test.describe("Marco 7 com autenticação e PostgreSQL reais", () => {
  test.describe.configure({ mode: "serial" });
  test.afterAll(async () => {
    await db.$disconnect();
  });

  test("professor prepara diário, recarrega, edita links e exclui tópico", async ({
    page,
  }, info) => {
    await login(page, "teacher", info.project.name);
    await openTeacher(page, info.project.name);
    const dialog = page.getByRole("dialog");
    const input = dialog.getByLabel("Novo tópico planejado");
    await expect(input).toBeVisible();
    await expect(input).toBeEditable();
    for (const topic of planned) {
      await input.fill(topic);
      await dialog
        .getByRole("button", { name: "Adicionar", exact: true })
        .click();
    }
    await save(page);
    await page.reload();
    await openTeacher(page, info.project.name);
    for (const topic of planned)
      await expect(dialog.getByText(topic, { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /Tópicos Ministrados/ }).click();
    for (const topic of taught) {
      await dialog.getByLabel("Novo tópico ministrado").fill(topic);
      await dialog
        .getByRole("button", { name: "Adicionar", exact: true })
        .click();
    }
    await save(page);
    const record = await readDiary(info.project.name);
    expect(
      record.contents
        .filter((item) => item.contentType === "PLANNED")
        .map((item) => item.title)
        .sort(),
    ).toEqual([...planned].sort());
    await dialog.getByRole("button", { name: /Materiais de Apoio/ }).click();
    await dialog.getByLabel("Título do Material").fill("Material inválido");
    await dialog
      .getByLabel("URL (http:// ou https://)")
      .fill("javascript:alert(1)");
    await dialog.getByRole("button", { name: "Adicionar Link" }).click();
    await expect(dialog.getByText(/A URL deve ser válida/)).toBeVisible();
    for (const [title, url] of [
      ["Documentação Java", "https://dev.java/learn/"],
      ["Código OpenJDK", "https://github.com/openjdk/jdk"],
    ]) {
      await dialog.getByLabel("Título do Material").fill(title);
      await dialog.getByLabel("URL (http:// ou https://)").fill(url);
      await dialog
        .getByLabel("Descrição Opcional", { exact: true })
        .fill("Material de apoio da aula");
      await dialog.getByRole("button", { name: "Adicionar Link" }).click();
    }
    await save(page);
    await dialog
      .getByRole("button", { name: "Editar material" })
      .first()
      .click();
    await dialog
      .getByLabel("Editar URL do material")
      .fill("https://docs.oracle.com/en/java/");
    await dialog.getByRole("button", { name: "Salvar", exact: true }).click();
    await save(page);
    await dialog.getByRole("button", { name: /Tópicos Planejados/ }).click();
    await dialog.getByRole("button", { name: "Remover tópico" }).last().click();
    await save(page);
    await page.reload();
    await openTeacher(page, info.project.name);
    await expect(
      dialog.getByText("Exercício prático", { exact: true }),
    ).toHaveCount(0);
    for (const topic of planned.slice(0, 4))
      await expect(dialog.getByText(topic, { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /Tópicos Ministrados/ }).click();
    for (const topic of taught)
      await expect(dialog.getByText(topic, { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: /Materiais de Apoio/ }).click();
    await expect(
      dialog.getByRole("link", { name: "Abrir" }).first(),
    ).toHaveAttribute("href", "https://docs.oracle.com/en/java/");
    await expect(dialog.getByRole("link", { name: "Abrir" })).toHaveCount(2);
    await expect(
      dialog.getByRole("button", { name: "Salvar Alterações do Diário" }),
    ).toBeVisible();
    await screenshot(page, info, "professor");
  });

  test("aluno consulta cronograma persistido sem controles de edição", async ({
    page,
  }, info) => {
    await login(page, "student", info.project.name);
    await page.getByRole("button", { name: "Aulas & Cronograma" }).click();
    const card = page.getByTestId(`lesson-${ids(info.project.name).lesson}`);
    await card
      .getByRole("heading", { name: "Herança em Java", exact: true })
      .click();
    for (const topic of planned.slice(0, 4))
      await expect(card.getByText(topic, { exact: true })).toBeVisible();
    for (const topic of taught)
      await expect(card.getByText(topic, { exact: true })).toBeVisible();
    const links = card.getByRole("link", { name: "Abrir", exact: true });
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveAttribute(
      "href",
      "https://docs.oracle.com/en/java/",
    );
    await expect(links.nth(1)).toHaveAttribute(
      "href",
      "https://github.com/openjdk/jdk",
    );
    for (const link of await links.all()) {
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    await expect(card.getByRole("textbox")).toHaveCount(0);
    await expect(
      card.getByRole("button", { name: /Editar|Salvar|Adicionar|Remover/ }),
    ).toHaveCount(0);
    await screenshot(page, info, "aluno");
    const empty = page.getByTestId(
      `lesson-${ids(info.project.name).emptyLesson}`,
    );
    await empty
      .getByRole("heading", { name: "Aula sem materiais", exact: true })
      .click();
    await expect(
      empty.getByText("Nenhum material de apoio cadastrado para esta aula."),
    ).toBeVisible();
    await expect(
      empty.getByRole("link", { name: "Abrir", exact: true }),
    ).toHaveCount(0);
  });

  test("diretor consulta, edita e recarrega o diário do professor", async ({
    page,
  }, info) => {
    await login(page, "director", info.project.name);
    async function open() {
      await page.getByRole("button", { name: /Turmas & Aulas/ }).click();
      await page
        .getByTestId(`class-${ids(info.project.name).class}`)
        .getByRole("button", { name: /Diário de Aulas/ })
        .click();
      await page
        .getByTestId(`lesson-${ids(info.project.name).lesson}`)
        .getByRole("button", { name: "Inspecionar / Editar Diário" })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await expect(
        page.getByRole("dialog").getByRole("heading", { level: 2 }),
      ).toHaveText("Aula 1 — Herança em Java");
    }
    await open();
    const dialog = page.getByRole("dialog");
    for (const topic of planned.slice(0, 4))
      await expect(dialog.getByText(topic, { exact: true })).toBeVisible();
    await dialog.getByRole("button", { name: "Editar tópico" }).first().click();
    await dialog
      .getByLabel("Editar tópico planejado")
      .fill("Herança revisada pela direção");
    await dialog
      .getByRole("button", { name: "Salvar alteração", exact: true })
      .click();
    await save(page);
    await page.reload();
    await open();
    await expect(
      dialog.getByText("Herança revisada pela direção", { exact: true }),
    ).toBeVisible();
    await expect(
      dialog.getByRole("button", { name: "Salvar Alterações do Diário" }),
    ).toBeVisible();
    await screenshot(page, info, "diretor");
  });

  test("autorização HTTP autenticada e turmas privadas na interface", async ({
    page,
  }, info) => {
    const f = ids(info.project.name);
    const original = await readDiary(info.project.name);
    await login(page, "student", info.project.name);
    expect(
      (
        await page.request.put(`/api/lessons/${f.lesson}`, {
          data: { plannedTopics: ["Ataque"] },
        })
      ).status(),
    ).toBe(403);
    await page.context().clearCookies();
    await login(page, "otherTeacher", info.project.name);
    await page.getByRole("button", { name: "Minhas Turmas" }).click();
    await expect(page.getByTestId(`class-${f.class}`)).toHaveCount(0);
    expect(
      (
        await page.request.put(`/api/lessons/${f.lesson}`, {
          data: { plannedTopics: ["Ataque"] },
        })
      ).status(),
    ).toBe(403);
    await page.context().clearCookies();
    await login(page, "outsider", info.project.name);
    await page.getByRole("button", { name: "Aulas & Cronograma" }).click();
    await expect(page.getByTestId(`lesson-${f.lesson}`)).toHaveCount(0);
    expect((await page.request.get(`/api/lessons/${f.lesson}`)).status()).toBe(
      403,
    );
    expect(
      (await page.request.get(`/api/classes/${f.class}/lessons`)).status(),
    ).toBe(403);
    expect(await readDiary(info.project.name)).toEqual(original);
    await page.context().clearCookies();
    await login(page, "director", info.project.name);
    const response = await page.request.put(`/api/lessons/${f.lesson}`, {
      data: { plannedTopics: ["Administração autorizada"] },
    });
    expect(response.status()).toBe(200);
    expect((await response.json()).lesson.plannedTopics).toEqual([
      "Administração autorizada",
    ]);
  });
});
