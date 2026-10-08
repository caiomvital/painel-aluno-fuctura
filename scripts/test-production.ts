// Real Next.js production process + isolated PostgreSQL; no mocked business operations.
import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { createServer } from "node:net";
import { randomUUID } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { hash } from "bcryptjs";
import { prisma } from "../lib/prisma";
import { createSessionToken, type Role } from "../lib/session-token";
import {
  requestStudentAttendance,
  confirmTeacherAttendance,
  updateLessonDiary,
} from "../lib/academic-service";
import { assertTestDatabase } from "../tests/helpers/database";
assertTestDatabase(process.env.DATABASE_URL);
const origin = "https://fuctura.example.test",
  prefix = `marco10_${randomUUID()}`,
  password = "Production-test-only-789!";
let passed = 0;
const report: { name: string; status: string }[] = [];
const children: ChildProcess[] = [];
const output: string[] = [];
async function check(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    report.push({ name, status: "APROVADO" });
  } catch (error) {
    report.push({ name, status: "BLOQUEADO" });
    throw error;
  }
  console.log(`PASS Marco 10 ${++passed}: ${name}`);
}
async function port() {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const p = (server.address() as { port: number }).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return p;
}
async function start(
  database: string,
  configuration: Record<string, string> = {},
) {
  const p = await port();
  const child = spawn("node", [".next/standalone/server.js"], {
    env: {
      ...process.env,
      NODE_ENV: "production",
      APP_URL: origin,
      DATABASE_URL: database,
      DIRECT_URL: database,
      HOSTNAME: "127.0.0.1",
      PORT: String(p),
      ...configuration,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  children.push(child);
  child.stdout!.on("data", (d) => output.push(String(d)));
  child.stderr!.on("data", (d) => output.push(String(d)));
  const base = `http://127.0.0.1:${p}`;
  for (let i = 0; i < 200; i++) {
    if (child.exitCode !== null)
      throw new Error("Servidor encerrou antes do teste.");
    try {
      if ((await fetch(base + "/api/health/live")).status === 200) return base;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Timeout de inicialização de produção.");
}
async function stop(child: ChildProcess) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 10000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    child.kill("SIGTERM");
  });
}
async function run() {
  try {
    const passwordHash = await hash(password, 10);
    const users = [];
    for (const role of ["DIRETOR", "PROFESSOR", "ALUNO"] as Role[]) {
      users.push(
        await prisma.user.create({
          data: {
            id: `${prefix}_${role}`,
            email: `${prefix}_${role.toLowerCase()}@example.test`,
            name: `Teste ${role}`,
            passwordHash,
            role,
            ...(role === "ALUNO"
              ? { student: { create: { registrationNumber: prefix } } }
              : role === "PROFESSOR"
                ? { teacher: { create: {} } }
                : { director: { create: {} } }),
          },
          include: { student: true, teacher: true },
        }),
      );
    }
    const [director, teacher, student] = users;
    assert(teacher.teacher && student.student);
    const course = await prisma.course.create({
      data: { id: `${prefix}_course`, name: "Curso teste", code: prefix },
    });
    const cls = await prisma.class.create({
      data: {
        courseId: course.id,
        teacherId: teacher.teacher.id,
        name: "Turma teste",
        code: prefix,
        startDate: new Date(),
        daysOfWeek: "SAB",
        scheduleTime: "08:30",
      },
    });
    const lesson = await prisma.lesson.create({
      data: {
        classId: cls.id,
        date: new Date(),
        lessonNumber: 1,
        scheduleTime: "08:30",
        plannedContent: "Planejado",
        title: "Teste produção",
      },
    });
    const foreignClass = await prisma.class.create({
      data: {
        courseId: course.id,
        name: "Outra turma",
        code: prefix + "_other",
        startDate: new Date(),
        daysOfWeek: "SAB",
        scheduleTime: "08:30",
      },
    });
    const foreignLesson = await prisma.lesson.create({
      data: {
        classId: foreignClass.id,
        date: new Date(),
        lessonNumber: 1,
        scheduleTime: "08:30",
        plannedContent: "Planejado",
        title: "Outra aula",
      },
    });
    await prisma.enrollment.create({
      data: { studentId: student.student.id, classId: cls.id },
    });
    const base = await start(process.env.DATABASE_URL!);
    const cookie = async (u: typeof director, extra = {}) =>
      `fuctura_session=${await createSessionToken({ id: u.id, email: u.email, name: u.name, role: u.role, ...extra })}`;
    const cookies = {
      director: await cookie(director),
      teacher: await cookie(teacher),
      student: await cookie(student),
    };
    const request = (path: string, c?: string, body?: unknown) =>
      fetch(base + path, {
        method: body === undefined ? "GET" : "POST",
        headers: {
          Origin: origin,
          ...(c ? { Cookie: c } : {}),
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    await check(
      "produção inicia e health público não divulga detalhes",
      async () => {
        const live = await request("/api/health/live");
        assert.equal(live.status, 200);
        assert.deepEqual(await live.json(), { status: "alive" });
        const ready = await request("/api/health/ready");
        assert.equal(ready.status, 200);
        assert.deepEqual(await ready.json(), { status: "ready" });
        assert.equal(ready.headers.get("cache-control"), "no-store");
        assert.equal(ready.headers.get("x-powered-by"), null);
        assert.equal(ready.headers.get("x-content-type-options"), "nosniff");
      },
    );
    await check(
      "produção não publica atalhos ou senhas demonstrativas",
      async () => {
        const page = await fetch(base + "/");
        assert.equal(page.status, 200);
        assert.doesNotMatch(
          await page.text(),
          /Demonstração &amp; Testes|Password123!|henrique.silveira@/,
        );
      },
    );
    await check("detalhes operacionais exigem DIRETOR", async () => {
      assert.equal((await request("/api/health/details")).status, 401);
      for (const c of [cookies.student, cookies.teacher])
        assert.equal((await request("/api/health/details", c)).status, 403);
      assert.deepEqual(
        await (await request("/api/health/details", cookies.director)).json(),
        {
          application: true,
          configuration: true,
          database: true,
          migrations: true,
          ready: true,
        },
      );
    });
    await check(
      "leilão anônimo é bloqueado sem criar dados demonstrativos",
      async () => {
        const before = await prisma.auctionItem.count();
        assert.equal((await request("/api/auction")).status, 401);
        assert.equal(await prisma.auctionItem.count(), before);
      },
    );
    await check(
      "CSRF bloqueia origem externa, null e ausência antes do login",
      async () => {
        for (const o of [undefined, "null", "https://evil.example.test"]) {
          const response = await fetch(base + "/api/auth/login", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(o ? { Origin: o } : {}),
            },
            body: JSON.stringify({ email: director.email, password }),
          });
          assert.equal(response.status, 403);
          assert.equal(response.headers.get("set-cookie"), null);
        }
      },
    );
    await check(
      "login de produção emite cookie seguro e não retorna hash/token",
      async () => {
        const response = await request("/api/auth/login", undefined, {
          email: director.email,
          password,
        });
        assert.equal(response.status, 200);
        const set = response.headers.get("set-cookie")!;
        assert.match(set, /HttpOnly/i);
        assert.match(set, /Secure/i);
        assert.match(set, /SameSite=lax/i);
        assert.match(set, /Max-Age=604800/i);
        assert.doesNotMatch(
          JSON.stringify(await response.json()),
          /passwordHash|fuctura_session|eyJ/,
        );
      },
    );
    await check(
      "payload inválido e JSON malformado têm resposta segura",
      async () => {
        assert.equal(
          (
            await request("/api/auth/login", undefined, {
              email: { secret: "x" },
              password: 123,
            })
          ).status,
          400,
        );
        const bad = await fetch(base + "/api/auth/login", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: '{"SENTINEL_SECRET":',
        });
        assert.equal(bad.status, 500);
        assert.doesNotMatch(
          await bad.text(),
          /SENTINEL_SECRET|SyntaxError|stack/,
        );
      },
    );
    await check(
      "limite real bloqueia tentativa 11 sem revelar existência da conta",
      async () => {
        for (let i = 0; i < 10; i++)
          assert.equal(
            (
              await request("/api/auth/login", undefined, {
                email: prefix + "@missing.example.test",
                password,
              })
            ).status,
            401,
          );
        const response = await request("/api/auth/login", undefined, {
          email: prefix + "@missing.example.test",
          password,
        });
        assert.equal(response.status, 429);
        assert.equal(response.headers.get("retry-after"), "600");
      },
    );
    await check("professor/aluno não acessam administração", async () => {
      for (const c of [cookies.teacher, cookies.student])
        assert.equal((await request("/api/director/dashboard", c)).status, 403);
    });
    await check(
      "sessão revalida perfil e ignora identificador de aluno forjado",
      async () => {
        const forged = await cookie(student, { studentId: "not-my-student" });
        assert.equal(
          (await request("/api/auction/statement", forged)).status,
          200,
        );
        const changed = await cookie(teacher);
        await prisma.user.update({
          where: { id: teacher.id },
          data: { role: "ALUNO" },
        });
        assert.equal(
          (await request("/api/teacher/dashboard", changed)).status,
          401,
        );
        await prisma.user.update({
          where: { id: teacher.id },
          data: { role: "PROFESSOR" },
        });
      },
    );
    await check("aluno não solicita presença sem matrícula ativa", async () => {
      assert.equal(
        (
          await request("/api/student/attendance", cookies.student, {
            lessonId: foreignLesson.id,
          })
        ).status,
        403,
      );
      await prisma.enrollment.updateMany({
        where: { studentId: student.student!.id },
        data: { status: "DROPPED" },
      });
      await assert.rejects(() =>
        requestStudentAttendance(lesson.id, student.id),
      );
      await prisma.enrollment.updateMany({
        where: { studentId: student.student!.id },
        data: { status: "ACTIVE" },
      });
      assert.equal(
        await prisma.attendance.count({
          where: { lessonId: foreignLesson.id },
        }),
        0,
      );
    });
    await check(
      "solicitação após confirmação não reabre nem duplica recompensa/ledgers",
      async () => {
        const attendance = await requestStudentAttendance(
          lesson.id,
          student.id,
        );
        await confirmTeacherAttendance(attendance.id, teacher.id);
        const before = await prisma.student.findUniqueOrThrow({
          where: { id: student.student!.id },
        });
        const points = await prisma.pointTransaction.count({
            where: { studentId: before.id },
          }),
          coins = await prisma.coinTransaction.count({
            where: { studentId: before.id },
          });
        assert.equal(
          (await requestStudentAttendance(lesson.id, student.id)).status,
          "PRESENT",
        );
        assert.equal(
          (await confirmTeacherAttendance(attendance.id, teacher.id)).status,
          "PRESENT",
        );
        const after = await prisma.student.findUniqueOrThrow({
          where: { id: before.id },
        });
        assert.equal(after.currentXp, before.currentXp);
        assert.equal(after.coinBalance, before.coinBalance);
        assert.equal(
          await prisma.pointTransaction.count({
            where: { studentId: before.id },
          }),
          points,
        );
        assert.equal(
          await prisma.coinTransaction.count({
            where: { studentId: before.id },
          }),
          coins,
        );
      },
    );
    await check(
      "URLs de materiais com credenciais e esquemas ativos são rejeitadas",
      async () => {
        for (const url of [
          "https://user:SENTINEL_SECRET@example.test/material",
          "javascript:alert(1)",
        ])
          await assert.rejects(() =>
            updateLessonDiary(
              lesson.id,
              { materials: [{ id: "unsafe", title: "Material", url }] },
              { id: director.id, role: "DIRETOR" },
            ),
          );
      },
    );
    await check(
      "lance fracionário ou negativo não modifica dados financeiros",
      async () => {
        const before = await prisma.coinTransaction.count();
        for (const amount of [0, -1, 1.5])
          assert.equal(
            (
              await request("/api/auction", cookies.student, {
                itemId: "invalid",
                amount,
              })
            ).status,
            400,
          );
        assert.equal(await prisma.coinTransaction.count(), before);
      },
    );
    await check(
      "cadastro produtivo bloqueia senha padrão e aceita senha individual",
      async () => {
        const email = prefix + "_created@example.test";
        assert.equal(
          (
            await request("/api/director/teachers", cookies.director, {
              name: "Novo professor",
              email,
            })
          ).status,
          400,
        );
        const response = await request(
          "/api/director/teachers",
          cookies.director,
          { name: "Novo professor", email, initialPassword: password },
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.doesNotMatch(
          JSON.stringify(body),
          /passwordHash|initialPassword/,
        );
        const created = await prisma.user.findUniqueOrThrow({
          where: { email },
        });
        assert(created.id);
        assert.equal(
          (await request("/api/auth/login", undefined, { email, password }))
            .status,
          200,
        );
      },
    );
    await check(
      "standalone serve PWA/estáticos e SW não recebe cache persistente",
      async () => {
        for (const path of ["/manifest.webmanifest", "/icon.svg", "/sw.js"]) {
          const response = await request(path);
          assert.equal(response.status, 200);
          if (path === "/sw.js")
            assert.match(response.headers.get("cache-control")!, /no-store/);
        }
      },
    );
    await check(
      "preflight inspeciona ambos os caminhos em transações somente leitura",
      async () => {
        const before = await prisma.user.count();
        const result = spawnSync(process.execPath, ["scripts/preflight.ts"], {
          env: { ...process.env, NODE_ENV: "production", APP_URL: origin },
          encoding: "utf8",
        });
        assert.equal(result.status, 0, result.stderr);
        const records = result.stdout
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        assert.equal(records.at(-1).safeToProceed, true);
        assert.equal(await prisma.user.count(), before);
        assert.doesNotMatch(result.stdout, /postgresql:\/\/|passwordHash/);
      },
    );
    await check(
      "sem banco: processo vivo, readiness 503 e erro de login controlado",
      async () => {
        const invalid =
          "postgresql://sentinel:SENTINEL_DB_PASSWORD@127.0.0.1:" +
          (await port()) +
          "/fuctura_marco10_test?connect_timeout=1";
        const broken = await start(invalid);
        assert.equal((await fetch(broken + "/api/health/live")).status, 200);
        const ready = await fetch(broken + "/api/health/ready");
        assert.equal(ready.status, 503);
        assert.deepEqual(await ready.json(), { status: "unavailable" });
        const login = await fetch(broken + "/api/auth/login", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify({ email: "broken@example.test", password }),
        });
        assert.equal(login.status, 500);
        assert.doesNotMatch(
          await login.text(),
          /SENTINEL_DB_PASSWORD|127\.0\.0\.1|Prisma|stack/,
        );
      },
    );
    await check(
      "configuração inválida bloqueia APIs preservando liveness",
      async () => {
        const misconfigured = await start(process.env.DATABASE_URL!, {
          AUTH_SECRET: "",
        });
        assert.equal(
          (await fetch(misconfigured + "/api/health/live")).status,
          200,
        );
        assert.equal(
          (await fetch(misconfigured + "/api/health/ready")).status,
          503,
        );
        const api = await fetch(misconfigured + "/api/auth/login", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify({ email: director.email, password }),
        });
        assert.equal(api.status, 503);
        assert.doesNotMatch(
          await api.text(),
          /AUTH_SECRET|postgresql|passwordHash/,
        );
      },
    );
    await check(
      "logs reais não contêm senhas, URLs de banco ou hashes",
      async () => {
        assert.doesNotMatch(
          output.join(""),
          /SENTINEL_DB_PASSWORD|SENTINEL_SECRET|postgresql:\/\/|\$2[aby]\$|Production-test-only/,
        );
        assert.match(output.join(""), /auth.login.rate_limited/);
        assert.match(output.join(""), /health.readiness.failed/);
      },
    );
    console.log(
      `Marco 10: ${passed} verificações de produção aprovadas em PostgreSQL isolado.`,
    );
  } finally {
    mkdirSync("production-report", { recursive: true });
    writeFileSync(
      "production-report/results.json",
      JSON.stringify({ passed, checks: report }, null, 2),
    );
    for (const child of children) await stop(child);
    await prisma.course.deleteMany({ where: { id: prefix + "_course" } });
    await prisma.user.deleteMany({
      where: {
        OR: [{ id: { startsWith: prefix } }, { email: { startsWith: prefix } }],
      },
    });
    await prisma.$disconnect();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
