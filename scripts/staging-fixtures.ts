// Never run automatically. Requires an approved isolated target and exact confirmation.
import { readFileSync } from "node:fs";
import { compare, hash } from "bcryptjs";
import {
  approveStagingTarget,
  fictionalAccountPassword,
  requireProvisioningMaintenance,
} from "../lib/staging-target";
import { operationalLog } from "../lib/operational-log";
const namespace = "hml_v1";
const accounts = [
  {
    key: "director",
    role: "DIRETOR",
    name: "Diretor Fictício",
    email: "director.homologacao@example.test",
  },
  {
    key: "teacher",
    role: "PROFESSOR",
    name: "Professor Fictício",
    email: "teacher.homologacao@example.test",
  },
  {
    key: "student1",
    role: "ALUNO",
    name: "Aluno Fictício 1",
    email: "student1.homologacao@example.test",
  },
  {
    key: "student2",
    role: "ALUNO",
    name: "Aluno Fictício 2",
    email: "student2.homologacao@example.test",
  },
] as const;
async function run() {
  const args = process.argv.slice(2);
  if (
    args.some(
      (a) => a !== "--apply" && a !== "--plan" && !a.startsWith("--confirm="),
    ) ||
    (args.includes("--apply") && args.includes("--plan"))
  )
    throw new Error("Argumentos recusados.");
  const approval = JSON.parse(
    readFileSync(process.env.HOMOLOGATION_APPROVAL_FILE ?? "", "utf8"),
  );
  const confirmation = args
    .find((a) => a.startsWith("--confirm="))
    ?.slice("--confirm=".length);
  const target = approveStagingTarget(process.env, approval, confirmation);
  if (!args.includes("--apply")) {
    console.log(
      JSON.stringify({
        mode: "plan",
        target: target.target,
        accounts: accounts.map((a) => ({ role: a.role, email: a.email })),
        course: 1,
        season: 1,
        classes: 1,
        lessons: 3,
        requests: 2,
        writes: false,
      }),
    );
    return;
  }
  if (confirmation !== target.confirmation)
    throw new Error("Confirmação explícita obrigatória.");
  requireProvisioningMaintenance(process.env.HOMOLOGATION_APP_STOPPED);
  const password = fictionalAccountPassword(
    process.env.HOMOLOGATION_ACCOUNT_PASSWORD,
    process.env.AUTH_SECRET,
  );
  const base = process.env.HOMOLOGATION_BASE_DATE;
  if (
    !base ||
    !/^\d{4}-\d{2}-\d{2}$/.test(base) ||
    new Date(base + "T12:00:00Z").toISOString().slice(0, 10) !== base
  )
    throw new Error("Data base explícita obrigatória.");
  const auctionEndsAt = new Date(
    process.env.HOMOLOGATION_AUCTION_ENDS_AT ?? "",
  );
  if (
    !Number.isFinite(auctionEndsAt.getTime()) ||
    auctionEndsAt.getTime() <= Date.now()
  )
    throw new Error("Fim futuro explícito da temporada fictícia obrigatório.");
  // Imports that construct Prisma are intentionally deferred until every target guard passes.
  const { prisma } = await import("../lib/prisma");
  const { PrismaClient } = await import("@prisma/client");
  const { databaseUrl } = await import("../lib/database-config");
  const { inspectDatabaseSchema } = await import("./supabase-schema");
  const services = await import("../lib/academic-service");
  const { reconcileCoinsBaseline } = await import("../lib/auction-service");
  const lockClient = new PrismaClient({
    datasources: { db: { url: databaseUrl(process.env.DIRECT_URL!) } },
    log: [],
  });
  try {
    await lockClient.$transaction(
      async (lock) => {
        const locked = await lock.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(2101002) AS locked`;
        if (!locked[0]?.locked)
          throw new Error("Outro provisionamento em andamento.");
        await prisma.$transaction(async (tx) => {
          await tx.$executeRaw`SET TRANSACTION READ ONLY`;
          const schema = await inspectDatabaseSchema(tx);
          if (
            schema.differences.length ||
            schema.pendingMigrations.length ||
            !schema.migrationHistoryVerified
          )
            throw new Error("Schema/migrations incompatíveis.");
        });
        // Refuse any non-fixture account/course/class, even with an approval file.
        const users = await prisma.user.findMany({
          select: { email: true, role: true, passwordHash: true },
        });
        for (const user of users) {
          const expected = accounts.find((a) => a.email === user.email);
          if (
            !expected ||
            expected.role !== user.role ||
            !(await compare(password, user.passwordHash))
          )
            throw new Error(
              "Dados/credenciais fora do conjunto fictício autorizado.",
            );
        }
        if (
          (await prisma.course.count({
            where: { code: { not: "HML-COURSE" } },
          })) ||
          (await prisma.class.count({ where: { code: { not: "HML-TURMA" } } }))
        )
          throw new Error("Banco contém recursos fora do conjunto fictício.");
        const director = await prisma.user.upsert({
          where: { email: accounts[0].email },
          update: {},
          create: {
            id: namespace + "_director",
            name: accounts[0].name,
            email: accounts[0].email,
            role: "DIRETOR",
            passwordHash: await hash(password, 10),
            profile: { create: {} },
            director: { create: { department: "Homologação fictícia" } },
          },
        });
        const teacher =
          (await prisma.teacher.findFirst({
            where: { user: { email: accounts[1].email } },
          })) ??
          (await services.createTeacherByDirector({
            name: accounts[1].name,
            email: accounts[1].email,
            initialPassword: password,
            specialty: "Homologação fictícia",
          }));
        const course = await prisma.course.upsert({
          where: { code: "HML-COURSE" },
          update: {},
          create: {
            id: namespace + "_course",
            code: "HML-COURSE",
            name: "Curso de homologação fictício",
          },
        });
        const cls =
          (await prisma.class.findUnique({ where: { code: "HML-TURMA" } })) ??
          (await services.createClassByDirector({
            name: "Turma de homologação fictícia",
            code: "HML-TURMA",
            courseId: course.id,
            teacherId: teacher.id,
            daysOfWeek: "SEG",
            scheduleTime: "09:00 - 12:00",
            durationMinutes: 180,
            lessonsPerWeek: 1,
            startDate: base,
          }));
        // Existing UI edits seasons but cannot create the first one on an empty DB.
        // Bootstrap metadata only; use model defaults, never create bids/reserves/debits.
        if (
          await prisma.auctionSeason.count({
            where: { id: { not: namespace + "_season" } },
          })
        )
          throw new Error("Temporada fora do conjunto fictício.");
        await prisma.auctionSeason.upsert({
          where: { id: namespace + "_season" },
          update: {},
          create: {
            id: namespace + "_season",
            title: "Temporada fictícia de homologação",
            description:
              "Sem prêmios reais; exclusivamente para testes autorizados.",
            startsAt: new Date(),
            endsAt: auctionEndsAt,
          },
        });
        const students = [];
        for (const account of accounts.slice(2)) {
          let student = await prisma.student.findFirst({
            where: { user: { email: account.email } },
          });
          if (!student) {
            const created = await services.createStudentByDirector({
              name: account.name,
              email: account.email,
              registrationNumber: namespace + "_" + account.key,
              initialPassword: password,
            });
            student = await prisma.student.findUniqueOrThrow({
              where: { id: created.id },
            });
          }
          const enrollment = await prisma.enrollment.findUnique({
            where: {
              studentId_classId: { studentId: student.id, classId: cls.id },
            },
          });
          if (!enrollment)
            await services.enrollStudentByDirector(student.id, cls.id);
          else if (enrollment.status !== "ACTIVE")
            throw new Error(
              "Matrícula alterada; não reativar automaticamente.",
            );
          students.push(student);
        }
        // Reuse approved baseline services, never write balances or ledgers manually.
        await services.reconcileHistoricalXpBaseline();
        await reconcileCoinsBaseline();
        for (let i = 0; i < 3; i++) {
          const id = `${namespace}_lesson_${i + 1}`;
          const date = new Date(base + "T12:00:00Z");
          date.setUTCDate(date.getUTCDate() + i * 7);
          const existing = await prisma.lesson.findUnique({ where: { id } });
          if (existing && existing.classId !== cls.id)
            throw new Error("Aula pertencente a outro recurso.");
          if (!existing) {
            // No lesson creation service exists. Bootstrap only the required relational model;
            // all diary/enrollment/attendance/financial operations use existing domain services.
            await prisma.lesson.create({
              data: {
                id,
                classId: cls.id,
                teacherId: teacher.id,
                lessonNumber: i + 1,
                title: `Aula fictícia ${i + 1}`,
                date,
                scheduleTime: "09:00 - 12:00",
                plannedContent: "Conteúdo de homologação fictício",
              },
            });
            await services.updateLessonDiary(
              id,
              {
                plannedTopics: ["Tópico fictício planejado"],
                ...(i === 0
                  ? {
                      taughtTopics: ["Conteúdo fictício registrado"],
                      materials: [
                        {
                          id: namespace + "_material",
                          title: "Material de demonstração",
                          url: "https://example.com/",
                        },
                      ],
                    }
                  : {}),
              },
              { id: director.id, role: "DIRETOR" },
            );
          }
        }
        // Preserve resolved requests and observations when run again; never reopen a rejection.
        for (const student of students) {
          const lessonId = namespace + "_lesson_1";
          if (
            !(await prisma.attendance.findUnique({
              where: {
                lessonId_studentId: { lessonId, studentId: student.id },
              },
            }))
          )
            await services.requestStudentAttendance(lessonId, student.userId);
        }
        console.log(
          JSON.stringify({
            status: "APROVADO",
            target: target.target,
            namespace,
            createdOrReused: true,
            passwordLogged: false,
            note: "Conjunto fictício preparado; homologação funcional ainda deve ser executada.",
          }),
        );
      },
      { timeout: 120000, maxWait: 5000 },
    );
  } finally {
    await lockClient.$disconnect();
    await prisma.$disconnect();
  }
}
run().catch((error) => {
  operationalLog("staging.fixtures.blocked", error);
  console.error(
    "Provisionamento bloqueado; não há rollback destrutivo automático. Corrija a causa e revise o plano antes de repetir.",
  );
  process.exitCode = 1;
});
