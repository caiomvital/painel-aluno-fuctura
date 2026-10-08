import type { Lesson } from "@prisma/client";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  getTeacherDashboard,
  getLessonWithDiary,
  getClassLessonsWithDiary,
  updateLessonDiary,
  confirmTeacherAttendance,
  rejectTeacherAttendance,
  getStudentAttendanceHistory,
  updateStudentAttendanceRecord,
} from "../lib/academic-service";
import { assertTestDatabase } from "../tests/helpers/database";
assertTestDatabase(process.env.DATABASE_URL);
const prefix = `marco8_${randomUUID()}`;
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`PASS Marco 8 ${++passed}: ${name}`);
}
async function forbidden(fn: () => Promise<unknown>) {
  await assert.rejects(
    fn,
    (e: unknown) => (e as { statusCode?: number }).statusCode === 403,
  );
}
async function run() {
  try {
    const teacher = await prisma.user.create({
      data: {
        id: `${prefix}_teacher`,
        email: `${prefix}_teacher@example.test`,
        name: "Professor teste",
        passwordHash: "test-only",
        role: "PROFESSOR",
        teacher: { create: {} },
      },
      include: { teacher: true },
    });
    const other = await prisma.user.create({
      data: {
        id: `${prefix}_other`,
        email: `${prefix}_other@example.test`,
        name: "Outro professor",
        passwordHash: "test-only",
        role: "PROFESSOR",
        teacher: { create: {} },
      },
      include: { teacher: true },
    });
    const student = await prisma.user.create({
      data: {
        id: `${prefix}_student`,
        email: `${prefix}_student@example.test`,
        name: "Aluno teste",
        passwordHash: "test-only",
        role: "ALUNO",
        student: { create: { registrationNumber: prefix } },
      },
      include: { student: true },
    });
    assert(teacher.teacher && other.teacher && student.student);
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
        scheduleTime: "08:30 - 12:30",
      },
    });
    await prisma.enrollment.create({
      data: { classId: cls.id, studentId: student.student.id },
    });
    const lessons: Lesson[] = [];
    for (let i = 0; i < 3; i++)
      lessons.push(
        await prisma.lesson.create({
          data: {
            classId: cls.id,
            teacherId: teacher.teacher.id,
            lessonNumber: i + 1,
            title: `Aula ${i + 1}`,
            plannedContent: "",
            date: new Date(
              i === 2 ? "2099-01-01T12:00:00Z" : "2026-01-01T12:00:00Z",
            ),
            scheduleTime: "08:30 - 12:30",
            status: i === 0 ? "COMPLETED" : "SCHEDULED",
          },
        }),
      );
    const a = await prisma.attendance.create({
      data: {
        studentId: student.student.id,
        lessonId: lessons[0].id,
        status: "PENDING",
      },
    });
    const b = await prisma.attendance.create({
      data: {
        studentId: student.student.id,
        lessonId: lessons[1].id,
        status: "PENDING",
        justificationReason: "Solicitação de teste",
      },
    });
    const session = { id: teacher.id, role: "PROFESSOR" };
    await check(
      "Painel real, turma atribuída e próxima aula futura",
      async () => {
        const d = await getTeacherDashboard(teacher.id);
        assert.equal(d.classes.length, 1);
        assert.equal(d.upcomingLesson?.id, lessons[2].id);
        assert.equal(d.pendingAttendances.length, 2);
        assert.equal(d.indicators.completed, 1);
        assert.equal(d.indicators.past, 2);
        assert.equal(d.pendingDiaries.length, 2);
        assert.equal(d.classes[0].students[0].attendanceRate, null);
      },
    );
    await check("Professor sem turmas não recebe dados fictícios", async () => {
      const d = await getTeacherDashboard(other.id);
      assert.deepEqual(d.classes, []);
      assert.equal(d.upcomingLesson, null);
    });
    await check("Professor autorizado consulta turma e diário", async () => {
      assert.equal((await getClassLessonsWithDiary(cls.id, session)).length, 3);
      assert.equal(
        (await getLessonWithDiary(lessons[0].id, session)).id,
        lessons[0].id,
      );
    });
    await check(
      "Outro professor não consulta diário nem cronograma, mesmo com ID forjado",
      async () => {
        const actor = {
          id: other.id,
          role: "PROFESSOR",
          teacherId: teacher.teacher!.id,
        };
        await forbidden(() => getLessonWithDiary(lessons[0].id, actor));
        await forbidden(() => getClassLessonsWithDiary(cls.id, actor));
        await forbidden(() =>
          updateLessonDiary(
            lessons[0].id,
            { taughtTopics: ["Indevido"] },
            actor,
          ),
        );
      },
    );
    await check(
      "Histórico e alteração de presença protegidos por turma",
      async () => {
        await forbidden(() =>
          getStudentAttendanceHistory(student.student!.id, {
            id: other.id,
            role: "PROFESSOR",
          }),
        );
        await forbidden(() =>
          updateStudentAttendanceRecord({
            studentId: student.student!.id,
            lessonId: lessons[0].id,
            status: "PRESENT",
            actorUserId: other.id,
          }),
        );
        await forbidden(() => confirmTeacherAttendance(a.id, other.id));
        await forbidden(() => rejectTeacherAttendance(b.id, other.id));
      },
    );
    await check(
      "Aluno não pode editar diário ou administrar presença",
      async () => {
        await forbidden(() =>
          updateLessonDiary(
            lessons[0].id,
            { taughtTopics: ["Indevido"] },
            { id: student.id, role: "ALUNO" },
          ),
        );
        await forbidden(() =>
          updateStudentAttendanceRecord({
            studentId: student.student!.id,
            lessonId: lessons[0].id,
            status: "PRESENT",
            actorUserId: student.id,
          }),
        );
      },
    );
    await check(
      "Diário e links persistem; indicadores atualizam sem confundir aula passada com concluída",
      async () => {
        await updateLessonDiary(
          lessons[1].id,
          {
            plannedTopics: ["Planejamento"],
            taughtTopics: ["Conteúdo ministrado"],
            materials: [
              {
                id: `${prefix}_material`,
                title: "Documentação",
                url: "https://www.typescriptlang.org/docs/",
              },
            ],
          },
          session,
        );
        const d = await getTeacherDashboard(teacher.id);
        assert.equal(d.indicators.diaries, 1);
        assert.equal(d.indicators.completed, 1);
        assert.equal(d.pendingDiaries.length, 1);
        assert.equal(
          (await getLessonWithDiary(lessons[1].id, session)).materials.length,
          1,
        );
      },
    );
    const rule = await prisma.gamificationRule.findUnique({
      where: { code: "XP_ATTENDANCE" },
    });
    const xp = rule?.isActive ? rule.xpValue : 20;
    await check(
      "Confirmações simultâneas e duplicadas concedem XP e Coins uma única vez",
      async () => {
        await Promise.all([
          confirmTeacherAttendance(a.id, teacher.id),
          confirmTeacherAttendance(a.id, teacher.id),
        ]);
        await confirmTeacherAttendance(a.id, teacher.id);
        const s = await prisma.student.findUniqueOrThrow({
          where: { id: student.student!.id },
          include: { streak: true },
        });
        assert.equal(s.currentXp, Math.max(0, xp));
        assert.equal(s.coinBalance, Math.max(0, xp));
        assert.equal(s.streak?.currentStreak, 1);
      },
    );
    await check(
      "Rejeição não concede recompensa e solicitação resolvida não é confirmada novamente",
      async () => {
        await rejectTeacherAttendance(b.id, teacher.id);
        await assert.rejects(() => confirmTeacherAttendance(b.id, teacher.id));
        await assert.rejects(() => rejectTeacherAttendance(a.id, teacher.id));
        const s = await prisma.student.findUniqueOrThrow({
          where: { id: student.student!.id },
        });
        assert.equal(s.currentXp, Math.max(0, xp));
        assert.equal(s.coinBalance, Math.max(0, xp));
      },
    );
    await check(
      "Ledgers íntegros e frequência calculada com registros reais",
      async () => {
        const points = await prisma.pointTransaction.findMany({
          where: { studentId: student.student!.id },
        });
        const coins = await prisma.coinTransaction.findMany({
          where: { studentId: student.student!.id },
        });
        assert.equal(points.length, xp > 0 ? 1 : 0);
        assert.equal(coins.length, xp > 0 ? 1 : 0);
        assert.equal(
          points.reduce((n, p) => n + p.amount, 0),
          Math.max(0, xp),
        );
        assert.equal(
          coins.reduce((n, p) => n + p.amount, 0),
          Math.max(0, xp),
        );
        const d = await getTeacherDashboard(teacher.id);
        assert.equal(d.pendingAttendances.length, 0);
        assert.equal(d.classes[0].students[0].attendanceRate, 50);
        assert.equal(d.classes[0].students[0].absentCount, 1);
      },
    );
    console.log(
      `Marco 8: ${passed} verificações aprovadas em PostgreSQL isolado.`,
    );
  } finally {
    await prisma.course.deleteMany({ where: { id: `${prefix}_course` } });
    await prisma.user.deleteMany({ where: { id: { startsWith: prefix } } });
    await prisma.$disconnect();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
