import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { compare } from "bcryptjs";
import { assertTestDatabase } from "../tests/helpers/database";
const url = assertTestDatabase(process.env.TEST_DATABASE_URL);
if (process.env.DATABASE_URL !== url || process.env.DIRECT_URL !== url)
  throw new Error("Conexões de teste divergentes.");
const { prisma } = await import("../lib/prisma");
const { requestRegistration, listRegistrations, reviewRegistration } =
  await import("../lib/registration-service");
const prefix = `registration_${randomUUID()}`;
const email = `${prefix}@example.test`;
let count = 0;
const pass = (name: string) => console.log(`PASS Cadastro ${++count}: ${name}`);
try {
  const director = await prisma.user.create({
    data: {
      name: "Diretor Teste",
      email: `${prefix}_director@example.test`,
      role: "DIRETOR",
      passwordHash: "unused",
    },
  });
  const teacher = await prisma.user.create({
    data: {
      name: "Professor Teste",
      email: `${prefix}_teacher@example.test`,
      role: "PROFESSOR",
      passwordHash: "unused",
    },
  });
  const request = await requestRegistration({
    name: "Aluno Teste",
    email: email.toUpperCase(),
    password: "senha123",
    course: "PYTHON",
    role: "DIRETOR",
  });
  assert.ok(request);
  const user = await prisma.user.findUniqueOrThrow({
    where: { email },
    include: { student: true },
  });
  assert.equal(user.role, "ALUNO");
  assert.equal(user.student, null);
  assert.notEqual(user.passwordHash, "senha123");
  assert.ok(await compare("senha123", user.passwordHash));
  pass(
    "cadastro persistido, ALUNO imposto, senha hash e nenhum perfil financeiro antes da aprovação",
  );
  await assert.rejects(() =>
    requestRegistration({
      name: "Outra",
      email,
      password: "senha123",
      course: "JAVA",
    }),
  );
  assert.equal(await prisma.user.count({ where: { email } }), 1);
  pass("e-mail duplicado não substitui cadastro ou senha");
  const rows = await listRegistrations(director.id);
  const row = rows.find((r) => r.id === request.id);
  assert.equal(row?.course, "PYTHON");
  assert.doesNotMatch(JSON.stringify(rows), /passwordHash|senha123/);
  pass("diretor consulta curso e pendência sem dados secretos");
  for (const actor of [teacher.id, user.id, "nonexistent"]) {
    await assert.rejects(() => listRegistrations(actor));
    await assert.rejects(() =>
      reviewRegistration(actor, request.id, "APPROVED", "ALUNO"),
    );
  }
  pass("professor, aluno e identidade inválida não consultam nem aprovam");
  await assert.rejects(() =>
    reviewRegistration(director.id, request.id, "PENDING"),
  );
  await assert.rejects(() =>
    reviewRegistration(director.id, "nonexistent", "APPROVED", "ALUNO"),
  );
  pass("decisão e identificador inválidos recusados");
  await Promise.all([
    reviewRegistration(director.id, request.id, "APPROVED", "ALUNO"),
    reviewRegistration(director.id, request.id, "APPROVED", "ALUNO"),
  ]);
  const student = await prisma.student.findUniqueOrThrow({
    where: { userId: user.id },
  });
  assert.equal(await prisma.student.count({ where: { userId: user.id } }), 1);
  const approved = await prisma.registrationRequest.findUniqueOrThrow({
    where: { id: request.id },
  });
  assert.equal(approved.status, "APPROVED");
  assert.equal(approved.reviewedById, director.id);
  assert.ok(approved.reviewedAt);
  pass("aprovação concorrente idempotente, com auditoria e um único aluno");
  assert.equal(student.currentXp, 0);
  assert.equal(student.coinBalance, 0);
  assert.equal(
    await prisma.enrollment.count({ where: { studentId: student.id } }),
    0,
  );
  assert.equal(
    await prisma.pointTransaction.count({ where: { studentId: student.id } }),
    0,
  );
  assert.equal(
    await prisma.coinTransaction.count({ where: { studentId: student.id } }),
    0,
  );
  pass("aprovação sem matrícula fictícia, XP, Coins ou lançamentos");
  await assert.rejects(() =>
    reviewRegistration(director.id, request.id, "REJECTED"),
  );
  pass("decisão final não pode ser invertida");
  const rejection = await requestRegistration({
    name: "Rejeitado",
    email: `${prefix}_rejected@example.test`,
    password: "abc123",
    course: "IA",
  });
  assert.ok(rejection);
  await reviewRegistration(director.id, rejection.id, "REJECTED");
  await reviewRegistration(director.id, rejection.id, "REJECTED");
  await assert.rejects(() =>
    reviewRegistration(director.id, rejection.id, "APPROVED", "ALUNO"),
  );
  const rejected = await prisma.registrationRequest.findUniqueOrThrow({
    where: { id: rejection.id },
  });
  assert.equal(
    await prisma.student.count({ where: { userId: rejected.userId } }),
    0,
  );
  pass("rejeição repetida sem aluno ou recompensa; acesso não reativado");
  await prisma.$disconnect();
  await prisma.$connect();
  assert.equal(
    (
      await prisma.registrationRequest.findUniqueOrThrow({
        where: { id: request.id },
      })
    ).status,
    "APPROVED",
  );
  pass("decisão persiste após reconexão");
  const teacherRequest = await requestRegistration({
    name: "Docente",
    email: `${prefix}_applicant_teacher@example.test`,
    password: "senha123",
    course: "JAVA",
    role: "DIRETOR",
  });
  assert.ok(teacherRequest);
  await assert.rejects(() =>
    reviewRegistration(director.id, teacherRequest.id, "APPROVED"),
  );
  await assert.rejects(() =>
    reviewRegistration(director.id, teacherRequest.id, "APPROVED", "DIRETOR"),
  );
  assert.equal(
    (
      await prisma.registrationRequest.findUniqueOrThrow({
        where: { id: teacherRequest.id },
      })
    ).status,
    "PENDING",
  );
  pass("aprovação exige escolha válida e nunca permite DIRETOR");
  await Promise.all([
    reviewRegistration(director.id, teacherRequest.id, "APPROVED", "PROFESSOR"),
    reviewRegistration(director.id, teacherRequest.id, "APPROVED", "PROFESSOR"),
  ]);
  const docente = await prisma.registrationRequest.findUniqueOrThrow({
    where: { id: teacherRequest.id },
    include: { user: { include: { teacher: true, student: true } } },
  });
  assert.equal(docente.user.role, "PROFESSOR");
  assert.ok(docente.user.teacher);
  assert.equal(docente.user.student, null);
  assert.ok(await compare("senha123", docente.user.passwordHash));
  assert.equal(
    await prisma.teacher.count({ where: { userId: docente.userId } }),
    1,
  );
  pass(
    "diretor aprova professor com a mesma senha, sem aluno ou recompensas e sem duplicidade",
  );
  await assert.rejects(() =>
    reviewRegistration(director.id, teacherRequest.id, "APPROVED", "ALUNO"),
  );
  assert.equal(
    (await prisma.user.findUniqueOrThrow({ where: { id: docente.userId } }))
      .role,
    "PROFESSOR",
  );
  pass("perfil de cadastro já aprovado é preservado em nova tentativa");
  const mixed = await requestRegistration({
    name: "Concorrência",
    email: `${prefix}_mixed@example.test`,
    password: "abc123",
    course: "IA",
  });
  assert.ok(mixed);
  const results = await Promise.allSettled([
    reviewRegistration(director.id, mixed.id, "APPROVED", "ALUNO"),
    reviewRegistration(director.id, mixed.id, "APPROVED", "PROFESSOR"),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const mixedRow = await prisma.registrationRequest.findUniqueOrThrow({
    where: { id: mixed.id },
    include: { user: { include: { student: true, teacher: true } } },
  });
  assert.equal(
    Number(!!mixedRow.user.student) + Number(!!mixedRow.user.teacher),
    1,
  );
  assert.equal(
    mixedRow.user.role,
    mixedRow.user.teacher ? "PROFESSOR" : "ALUNO",
  );
  pass(
    "aprovações concorrentes com perfis diferentes criam somente o perfil vencedor",
  );
} finally {
  const students = await prisma.student.findMany({
    where: { user: { email: { startsWith: prefix } } },
    select: { id: true },
  });
  await prisma.streak.deleteMany({
    where: { studentId: { in: students.map((s) => s.id) } },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
  await prisma.$disconnect();
}
