import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { prisma } from "../lib/prisma";
import {
  getLessonWithDiary,
  getClassLessonsWithDiary,
  updateLessonDiary,
  updateStudentByDirector,
} from "../lib/academic-service";

import { assertTestDatabase } from "../tests/helpers/database";

assertTestDatabase(process.env.DATABASE_URL);

const prefix = `marco7_${randomUUID()}`;
let passed = 0;
async function check(name: string, run: () => Promise<void>) {
  await run();
  passed++;
  console.log(`PASS ${passed}: ${name}`);
}
async function forbidden(run: () => Promise<unknown>) {
  await assert.rejects(
    run,
    (error: unknown) => (error as { statusCode?: number }).statusCode === 403,
  );
}

async function run() {
  try {
    const teacherUser = await prisma.user.create({
      data: {
        id: `${prefix}_teacher`,
        email: `${prefix}_teacher@example.test`,
        name: "Professor teste",
        passwordHash: "not-a-login-password",
        role: "PROFESSOR",
        teacher: { create: {} },
      },
      include: { teacher: true },
    });
    const otherTeacher = await prisma.user.create({
      data: {
        id: `${prefix}_otherteacher`,
        email: `${prefix}_otherteacher@example.test`,
        name: "Outro professor",
        passwordHash: "not-a-login-password",
        role: "PROFESSOR",
        teacher: { create: {} },
      },
      include: { teacher: true },
    });
    const directorUser = await prisma.user.create({
      data: {
        id: `${prefix}_director`,
        email: `${prefix}_director@example.test`,
        name: "Diretor teste",
        passwordHash: "not-a-login-password",
        role: "DIRETOR",
        director: { create: {} },
      },
    });
    const studentUser = await prisma.user.create({
      data: {
        id: `${prefix}_student`,
        email: `${prefix}_student@example.test`,
        name: "Aluno teste",
        passwordHash: "not-a-login-password",
        role: "ALUNO",
        student: {
          create: {
            registrationNumber: `${prefix}_registration`,
            coinBalance: 100,
          },
        },
      },
      include: { student: true },
    });
    const outsider = await prisma.user.create({
      data: {
        id: `${prefix}_outsider`,
        email: `${prefix}_outsider@example.test`,
        name: "Aluno outra turma",
        passwordHash: "not-a-login-password",
        role: "ALUNO",
        student: {
          create: { registrationNumber: `${prefix}_other_registration` },
        },
      },
      include: { student: true },
    });
    assert(
      teacherUser.teacher &&
        otherTeacher.teacher &&
        studentUser.student &&
        outsider.student,
    );
    const course = await prisma.course.create({
      data: { id: `${prefix}_course`, code: prefix, name: "Curso teste" },
    });
    const cls = await prisma.class.create({
      data: {
        id: `${prefix}_class`,
        code: prefix,
        name: "Turma teste",
        courseId: course.id,
        teacherId: teacherUser.teacher.id,
        startDate: new Date(),
        daysOfWeek: "SAB",
        scheduleTime: "08:30 - 12:30",
      },
    });
    await prisma.enrollment.create({
      data: { classId: cls.id, studentId: studentUser.student.id },
    });
    const lesson = await prisma.lesson.create({
      data: {
        classId: cls.id,
        teacherId: teacherUser.teacher.id,
        lessonNumber: 1,
        title: "Herança",
        date: new Date(),
        scheduleTime: cls.scheduleTime,
        plannedContent: "",
      },
    });
    await prisma.attendance.create({
      data: {
        lessonId: lesson.id,
        studentId: studentUser.student.id,
        status: "PRESENT",
      },
    });
    const teacher = {
      id: teacherUser.id,
      role: "PROFESSOR",
      teacherId: teacherUser.teacher.id,
    };
    const director = { id: directorUser.id, role: "DIRETOR" };
    const student = {
      id: studentUser.id,
      role: "ALUNO",
      studentId: studentUser.student.id,
    };
    const read = () => getLessonWithDiary(lesson.id, teacher);
    const write = (data: Parameters<typeof updateLessonDiary>[1]) =>
      updateLessonDiary(lesson.id, data, teacher);
    const snapshot = async () => ({
      student: await prisma.student.findUniqueOrThrow({
        where: { id: student.studentId },
      }),
      attendance: await prisma.attendance.findMany({
        where: { lessonId: lesson.id },
        orderBy: { id: "asc" },
      }),
      points: await prisma.pointTransaction.findMany({
        where: { studentId: student.studentId },
        orderBy: { id: "asc" },
      }),
      coins: await prisma.coinTransaction.findMany({
        where: { studentId: student.studentId },
        orderBy: { id: "asc" },
      }),
    });
    const before = await snapshot();
    const planned = [
      "Herança",
      "extends",
      "Atributos",
      "Sobrescrita",
      "Exercício",
    ];
    const taught = ["Herança", "extends", "Pessoa e Aluno"];
    await check("cinco tópicos planejados", async () => {
      await write({ plannedTopics: planned });
      assert.deepEqual((await read()).plannedTopics, planned);
    });
    await check("três tópicos ministrados independentes", async () => {
      await write({ taughtTopics: taught });
      const diary = await read();
      assert.deepEqual(diary.plannedTopics, planned);
      assert.deepEqual(diary.taughtTopics, taught);
    });
    await check("dois links externos", async () => {
      await write({
        materials: [
          {
            id: "code",
            title: "Java",
            url: "https://docs.oracle.com/en/java/",
          },
          {
            id: "source",
            title: "Código",
            url: "https://github.com/openjdk/jdk",
            description: "OpenJDK",
          },
        ],
      });
      assert.equal((await read()).materials.length, 2);
    });
    await check("editar link preserva tópicos", async () => {
      const materials = (await read()).materials;
      materials[0].url = "https://dev.java/learn/";
      await write({ materials });
      const diary = await read();
      assert.equal(diary.materials[0].url, materials[0].url);
      assert.deepEqual(diary.plannedTopics, planned);
      assert.deepEqual(diary.taughtTopics, taught);
    });
    await check("editar e excluir tópico preserva materiais", async () => {
      await write({
        plannedTopics: ["Herança em Java", ...planned.slice(1, 4)],
      });
      const diary = await read();
      assert.equal(diary.plannedTopics.length, 4);
      assert.equal(diary.plannedTopics[0], "Herança em Java");
      assert.equal(diary.materials.length, 2);
    });
    await check("excluir link preserva planejados e ministrados", async () => {
      await write({ materials: (await read()).materials.slice(0, 1) });
      const diary = await read();
      assert.equal(diary.materials.length, 1);
      assert.equal(diary.plannedTopics.length, 4);
      assert.deepEqual(diary.taughtTopics, taught);
    });
    await check("aluno matriculado consulta diário e cronograma", async () => {
      assert.deepEqual(
        await getLessonWithDiary(lesson.id, student),
        await read(),
      );
      const lessons = await getClassLessonsWithDiary(cls.id, student);
      assert.deepEqual(lessons[0], await read());
    });
    await check("aluno sem matrícula é bloqueado", async () => {
      const session = {
        id: outsider.id,
        role: "ALUNO",
        studentId: outsider.student!.id,
      };
      await forbidden(() => getLessonWithDiary(lesson.id, session));
      await forbidden(() => getClassLessonsWithDiary(cls.id, session));
    });
    await check("matrícula inativa é bloqueada", async () => {
      await prisma.enrollment.update({
        where: {
          studentId_classId: { studentId: student.studentId, classId: cls.id },
        },
        data: { status: "DROPPED" },
      });
      await forbidden(() => getLessonWithDiary(lesson.id, student));
      await prisma.enrollment.update({
        where: {
          studentId_classId: { studentId: student.studentId, classId: cls.id },
        },
        data: { status: "ACTIVE" },
      });
    });
    await check("aluno não edita", async () => {
      await forbidden(() =>
        updateLessonDiary(lesson.id, { plannedTopics: [] }, student),
      );
    });
    await check("outro professor não edita", async () => {
      await forbidden(() =>
        updateLessonDiary(
          lesson.id,
          { plannedTopics: [] },
          {
            id: otherTeacher.id,
            role: "PROFESSOR",
            teacherId: otherTeacher.teacher!.id,
          },
        ),
      );
    });
    await check("diretor consulta e edita", async () => {
      assert.equal(
        (await getLessonWithDiary(lesson.id, director)).id,
        lesson.id,
      );
      await updateLessonDiary(
        lesson.id,
        { taughtTopics: [...taught, "Revisão"] },
        director,
      );
      assert.equal((await read()).taughtTopics.length, 4);
    });
    await check(
      "título obrigatório e protocolos inseguros são rejeitados",
      async () => {
        for (const material of [
          { id: "bad", title: "", url: "https://example.com" },
          { id: "bad", title: "X", url: "javascript:alert(1)" },
          { id: "bad", title: "X", url: "https://" },
        ]) {
          await assert.rejects(
            () => write({ materials: [material] }),
            (error: unknown) =>
              (error as { statusCode?: number }).statusCode === 400,
          );
        }
      },
    );
    await check(
      "persistência após reconectar e preservação de cronograma",
      async () => {
        const expected = await read();
        await prisma.$disconnect();
        assert.deepEqual(await read(), expected);
        const saved = await prisma.lesson.findUniqueOrThrow({
          where: { id: lesson.id },
        });
        assert.equal(saved.title, lesson.title);
        assert.equal(saved.date.toISOString(), lesson.date.toISOString());
        assert.equal(saved.scheduleTime, lesson.scheduleTime);
        assert.equal(saved.status, lesson.status);
        assert.equal(saved.classId, lesson.classId);
        assert.equal(saved.teacherId, lesson.teacherId);
      },
    );
    await check("presença, XP, Coins e ledgers inalterados", async () => {
      assert.deepEqual(await snapshot(), before);
    });
    await check("aula sem conteúdo retorna listas vazias", async () => {
      await write({ plannedTopics: [], taughtTopics: [], materials: [] });
      const diary = await read();
      assert.deepEqual(diary.plannedTopics, []);
      assert.deepEqual(diary.taughtTopics, []);
      assert.deepEqual(diary.materials, []);
    });
    await check(
      "dois ajustes manuais de XP reconciliam ledger sem Coins",
      async () => {
        await updateStudentByDirector(
          student.studentId,
          { currentXp: 50 },
          director.id,
        );
        await updateStudentByDirector(
          student.studentId,
          { currentXp: 80 },
          director.id,
        );
        const after = await snapshot();
        assert.equal(after.student.currentXp, 80);
        assert.equal(after.points.length, 2);
        assert(
          after.points.every(
            (point) => point.type === "MANUAL" && point.originReference,
          ),
        );
        assert.notEqual(
          after.points[0].originReference,
          after.points[1].originReference,
        );
        assert.equal(
          after.points.reduce((sum, point) => sum + point.amount, 0),
          after.student.currentXp,
        );
        assert.equal(after.student.coinBalance, before.student.coinBalance);
        assert.deepEqual(after.coins, before.coins);
        assert.deepEqual(after.attendance, before.attendance);
      },
    );
    console.log(`${passed} verificações passaram; nenhuma omitida.`);
  } finally {
    // Delete only this run's own fixtures, even after an assertion fails.
    await prisma.course.deleteMany({ where: { id: `${prefix}_course` } });
    await prisma.user.deleteMany({
      where: {
        id: {
          in: [
            "teacher",
            "otherteacher",
            "director",
            "student",
            "outsider",
          ].map((role) => `${prefix}_${role}`),
        },
      },
    });
    await prisma.$disconnect();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
