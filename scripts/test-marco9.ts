import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { assertTestDatabase } from "../tests/helpers/database";
import {
  getDirectorDashboard,
  createClassByDirector,
  updateClassByDirector,
  deleteClassByDirector,
  createTeacherByDirector,
  updateTeacherByDirector,
  createStudentByDirector,
  updateStudentByDirector,
  enrollStudentByDirector,
  updateEnrollmentByDirector,
  updateLessonDiary,
  getLessonWithDiary,
  confirmTeacherAttendance,
  rejectTeacherAttendance,
} from "../lib/academic-service";
import {
  manualAdjustStudentCoins,
  placeAuctionBid,
  closeAuctionItem,
  getAuctionOverview,
} from "../lib/auction-service";
assertTestDatabase(process.env.DATABASE_URL);
const prefix = `marco9_${randomUUID()}`;
let passed = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  console.log(`PASS Marco 9 ${++passed}: ${name}`);
}
async function run() {
  try {
    const director = await prisma.user.create({
      data: {
        email: `${prefix}_director@example.test`,
        name: "Diretor teste",
        role: "DIRETOR",
        passwordHash: "test-only",
        director: { create: {} },
      },
    });
    const teacher = await createTeacherByDirector({
      name: "Professor Marco 9",
      email: `${prefix}_teacher@example.test`,
    });
    const student = await createStudentByDirector({
      name: "Aluno Marco 9",
      email: `${prefix}_student@example.test`,
      registrationNumber: prefix,
    });
    const course = await prisma.course.create({
      data: { id: prefix, name: "Curso Marco 9", code: prefix },
    });
    let cls: Awaited<ReturnType<typeof createClassByDirector>>;
    await check("criação de turma e validação de referências", async () => {
      await assert.rejects(() =>
        createClassByDirector({
          name: "Inválida",
          code: prefix,
          courseId: "inexistente",
          daysOfWeek: "SEG",
          scheduleTime: "09:00",
          durationMinutes: 90,
          lessonsPerWeek: 1,
        }),
      );
      cls = await createClassByDirector({
        name: "Turma Marco 9",
        code: prefix,
        courseId: course.id,
        daysOfWeek: "SEG",
        scheduleTime: "09:00 - 10:30",
        durationMinutes: 90,
        lessonsPerWeek: 1,
        startDate: "2026-01-01",
      });
      assert.equal(cls.status, "ACTIVE");
      assert.equal(cls.teacherId, null);
    });
    const lesson = await prisma.lesson.create({
      data: {
        classId: cls!.id,
        teacherId: teacher.id,
        lessonNumber: 1,
        plannedContent: "",
        title: "Diário Marco 9",
        date: new Date("2026-01-03T12:00:00Z"),
        scheduleTime: "09:00",
        status: "SCHEDULED",
      },
    });
    const future = await prisma.lesson.create({
      data: {
        classId: cls!.id,
        lessonNumber: 2,
        plannedContent: "",
        title: "Futura Marco 9",
        date: new Date("2099-01-01"),
        scheduleTime: "09:00",
      },
    });
    await check(
      "edição de turma e atribuição preservam o professor histórico da aula",
      async () => {
        await updateClassByDirector(cls!.id, {
          name: "Turma editada",
          teacherId: teacher.id,
          endDate: "2099-02-01",
        });
        await updateClassByDirector(cls!.id, { teacherId: null });
        assert.equal(
          (await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } }))
            .teacherId,
          teacher.id,
        );
        await updateClassByDirector(cls!.id, { teacherId: teacher.id });
        await assert.rejects(() =>
          updateClassByDirector(cls!.id, { status: "INVENTED" }),
        );
      },
    );
    let enrollmentId = "";
    await check(
      "matrícula persistida e duplicidade concorrente bloqueada",
      async () => {
        const results = await Promise.allSettled([
          enrollStudentByDirector(student.id, cls!.id),
          enrollStudentByDirector(student.id, cls!.id),
        ]);
        assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
        const enrollment = await prisma.enrollment.findUniqueOrThrow({
          where: {
            studentId_classId: { studentId: student.id, classId: cls!.id },
          },
        });
        enrollmentId = enrollment.id;
        await assert.rejects(() =>
          enrollStudentByDirector(student.id, cls!.id),
        );
      },
    );
    const attendance = await prisma.attendance.create({
      data: { lessonId: lesson.id, studentId: student.id, status: "PENDING" },
    });
    const reject = await prisma.attendance.create({
      data: { lessonId: future.id, studentId: student.id, status: "PENDING" },
    });
    async function snapshot() {
      return {
        student: await prisma.student.findUniqueOrThrow({
          where: { id: student.id },
        }),
        points: await prisma.pointTransaction.findMany({
          where: { studentId: student.id },
        }),
        coins: await prisma.coinTransaction.findMany({
          where: { studentId: student.id },
        }),
      };
    }
    await check(
      "indicadores reais, sem inferir aula ministrada pela data",
      async () => {
        const d = await getDirectorDashboard(director.id);
        const c = d.classes.find((c) => c.id === cls!.id)!;
        assert.equal(c.enrolledCount, 1);
        assert.equal(c.pedagogy.past, 1);
        assert.equal(c.pedagogy.completed, 0);
        assert.equal(c.pedagogy.diaries, 0);
        assert.equal(c.pedagogy.future, 1);
        assert.equal(c.pedagogy.pastDiaryPercent, 0);
        assert.equal(
          d.pendingDiaries.filter((l) => l.classId === cls!.id).length,
          1,
        );
        assert.equal(
          d.students.find((s) => s.id === student.id)?.attendanceRate,
          null,
        );
        assert(!JSON.stringify(d).includes("passwordHash"));
      },
    );
    await check(
      "professor e aluno não consultam dashboard administrativo",
      async () => {
        for (const id of [teacher.userId, student.userId])
          await assert.rejects(
            () => getDirectorDashboard(id),
            (e: any) => e.statusCode === 403,
          );
      },
    );
    await check("consulta a alunos matriculados e cronograma", async () => {
      const d = await getDirectorDashboard(director.id);
      const c = d.classes.find((c) => c.id === cls!.id)!;
      assert.equal(c.enrollments[0].studentId, student.id);
      assert.equal(c.lessons.length, 2);
      assert.equal(c.nextLesson?.id, future.id);
    });
    await check(
      "edição de dados administrativos e professores mantém saldos e ledgers",
      async () => {
        const before = await snapshot();
        await updateStudentByDirector(
          student.id,
          { name: "Aluno editado", email: `${prefix}_student@example.test` },
          director.id,
        );
        await updateTeacherByDirector(teacher.id, {
          name: "Professor editado",
          specialty: "Java",
        });
        const after = await snapshot();
        assert.equal(after.student.currentXp, before.student.currentXp);
        assert.equal(after.student.coinBalance, before.student.coinBalance);
        assert.deepEqual(after.points, before.points);
        assert.deepEqual(after.coins, before.coins);
      },
    );
    await check(
      "diário único com tópicos e material persistidos sem efeitos financeiros",
      async () => {
        const before = await snapshot();
        await updateLessonDiary(
          lesson.id,
          {
            plannedTopics: ["Planejado"],
            taughtTopics: ["Ministrado"],
            materials: [
              {
                id: "m9_link",
                title: "Documentação",
                url: "https://www.postgresql.org/docs/",
                description: "Referência",
              },
            ],
          },
          { id: director.id, role: "DIRETOR" },
        );
        const diary = await getLessonWithDiary(lesson.id, {
          id: director.id,
          role: "DIRETOR",
        });
        assert.deepEqual(diary.taughtTopics, ["Ministrado"]);
        assert.equal(
          diary.materials[0].url,
          "https://www.postgresql.org/docs/",
        );
        const after = await snapshot();
        assert.deepEqual(after.points, before.points);
        assert.deepEqual(after.coins, before.coins);
      },
    );
    await check(
      "indicadores atualizados e percentual apenas sobre aulas passadas",
      async () => {
        const d = await getDirectorDashboard(director.id);
        const c = d.classes.find((c) => c.id === cls!.id)!;
        assert.equal(c.pedagogy.pastDiaryPercent, 100);
        assert.equal(c.pedagogy.diaries, 1);
        assert.equal(
          d.pendingDiaries.filter((l) => l.classId === cls!.id).length,
          0,
        );
      },
    );
    await check(
      "diretor confirma presença, duplicidade concorrente recompensa uma única vez",
      async () => {
        const before = await snapshot();
        await Promise.all([
          confirmTeacherAttendance(attendance.id, director.id),
          confirmTeacherAttendance(attendance.id, director.id),
        ]);
        const after = await snapshot();
        const points = after.points.filter(
          (p) => p.originReference === lesson.id,
        );
        const coins = after.coins.filter(
          (p) => p.originReference === lesson.id,
        );
        assert.equal(points.length, 1);
        assert.equal(coins.length, 1);
        assert.equal(points[0].amount, coins[0].amount);
        assert.equal(
          after.student.currentXp - before.student.currentXp,
          points[0].amount,
        );
        assert.equal(
          after.student.coinBalance - before.student.coinBalance,
          coins[0].amount,
        );
      },
    );
    await check(
      "rejeição não recompensa, confirmações de rejeitadas são bloqueadas",
      async () => {
        const before = await snapshot();
        await rejectTeacherAttendance(
          reject.id,
          director.id,
          "Solicitação rejeitada",
        );
        await assert.rejects(() =>
          confirmTeacherAttendance(reject.id, director.id),
        );
        const after = await snapshot();
        assert.deepEqual(after.points, before.points);
        assert.deepEqual(after.coins, before.coins);
        assert.equal(after.student.coinBalance, before.student.coinBalance);
        assert.equal(after.student.currentXp, before.student.currentXp);
      },
    );
    await check(
      "situação da matrícula e encerramento preservam histórico e saldos",
      async () => {
        const before = await snapshot();
        await updateEnrollmentByDirector(enrollmentId, "COMPLETED");
        await updateClassByDirector(cls!.id, { status: "FINISHED" });
        await assert.rejects(() => deleteClassByDirector(cls!.id));
        await assert.rejects(() =>
          updateEnrollmentByDirector(enrollmentId, "FAKE"),
        );
        assert.equal(
          await prisma.attendance.count({ where: { studentId: student.id } }),
          2,
        );
        assert.equal(
          await prisma.lesson.count({ where: { classId: cls!.id } }),
          2,
        );
        const after = await snapshot();
        assert.deepEqual(after.points, before.points);
        assert.deepEqual(after.coins, before.coins);
        assert.equal(after.student.currentXp, before.student.currentXp);
      },
    );
    await check(
      "compatibilidade do fluxo antigo de matrícula não apaga registros",
      async () => {
        await updateStudentByDirector(
          student.id,
          { classId: cls!.id },
          director.id,
        );
        await updateStudentByDirector(student.id, { classId: "" }, director.id);
        const e = await prisma.enrollment.findUniqueOrThrow({
          where: { id: enrollmentId },
        });
        assert.equal(e.status, "DROPPED");
        assert.equal(
          await prisma.attendance.count({ where: { studentId: student.id } }),
          2,
        );
      },
    );
    await check("persistência após reconexão", async () => {
      const independent = new PrismaClient();
      try {
        const e = await independent.enrollment.findUniqueOrThrow({
          where: { id: enrollmentId },
        });
        assert.equal(e.studentId, student.id);
        assert.equal(
          await independent.lessonContent.count({
            where: { lessonId: lesson.id, contentType: "TAUGHT" },
          }),
          1,
        );
      } finally {
        await independent.$disconnect();
      }
    });
    await check(
      "edição permite limpar especialidade sem apagar histórico docente",
      async () => {
        await updateTeacherByDirector(teacher.id, { specialty: "" });
        assert.equal(
          (
            await prisma.teacher.findUniqueOrThrow({
              where: { id: teacher.id },
            })
          ).specialty,
          null,
        );
        assert.equal(
          (await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } }))
            .teacherId,
          teacher.id,
        );
      },
    );
    await check(
      "ajustes simultâneos de XP reconciliam o ledger e preservam Coins",
      async () => {
        const before = await snapshot();
        await Promise.all([
          updateStudentByDirector(
            student.id,
            { currentXp: before.student.currentXp + 10 },
            director.id,
          ),
          updateStudentByDirector(
            student.id,
            { currentXp: before.student.currentXp + 20 },
            director.id,
          ),
        ]);
        const after = await snapshot();
        const ids = new Set(before.points.map((p) => p.id));
        assert.equal(
          after.points
            .filter((p) => !ids.has(p.id))
            .reduce((sum, p) => sum + p.amount, 0),
          after.student.currentXp - before.student.currentXp,
        );
        assert.equal(
          after.student.level,
          Math.floor(after.student.currentXp / 300) + 1,
        );
        assert.equal(after.student.coinBalance, before.student.coinBalance);
        assert.deepEqual(after.coins, before.coins);
      },
    );
    await check(
      "ajustes de Coins respeitam reservas e encerramento mantém XP e ledgers",
      async () => {
        await manualAdjustStudentCoins({
          studentId: student.id,
          amount: 1000,
          description: "Saldo teste",
          directorUserId: director.id,
        });
        const season = await prisma.auctionSeason.create({
          data: {
            id: `${prefix}_season`,
            title: "Temporada teste Marco 9",
            endsAt: new Date("2099-01-01"),
            minBidIncrement: 50,
          },
        });
        const item = await prisma.auctionItem.create({
          data: {
            seasonId: season.id,
            title: "Item teste Marco 9",
            category: "Teste",
            description: "Teste",
            startingBid: 100,
            currentBid: 100,
            minNextBid: 150,
            endsAt: new Date("2099-01-01"),
          },
        });
        const xp = (await snapshot()).student.currentXp;
        const bid = await placeAuctionBid(item.id, student.id, 150);
        assert.equal(bid.success, true, bid.error);
        const balance = (await snapshot()).student.coinBalance;
        await assert.rejects(() =>
          manualAdjustStudentCoins({
            studentId: student.id,
            amount: -(balance - 100),
            description: "Débito inválido",
            directorUserId: director.id,
          }),
        );
        assert.equal((await snapshot()).student.coinBalance, balance);
        await closeAuctionItem(item.id);
        await closeAuctionItem(item.id);
        const after = await snapshot();
        assert.equal(after.student.currentXp, xp);
        assert.equal(after.student.coinBalance, balance - 150);
        assert.equal(
          after.coins.filter(
            (c) => c.originReference === `AUCTION_WIN_${item.id}`,
          ).length,
          1,
        );
        assert.equal(
          await prisma.coinReservation.count({
            where: { studentId: student.id, status: "ACTIVE" },
          }),
          0,
        );
      },
    );
    await check(
      "leitura da direção não gera itens demonstrativos",
      async () => {
        const count = await prisma.auctionItem.count();
        await getAuctionOverview(undefined, false);
        assert.equal(await prisma.auctionItem.count(), count);
      },
    );
  } finally {
    await prisma.auctionSeason.deleteMany({
      where: { id: `${prefix}_season` },
    });
    await prisma.course.deleteMany({ where: { id: prefix } });
    await prisma.user.deleteMany({ where: { email: { startsWith: prefix } } });
    await prisma.$disconnect();
  }
}
run().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
