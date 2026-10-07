import { hash } from "bcryptjs";
import { db, ids, password } from "./data";
export default async function setup() {
  try {
    const passwordHash = await hash(password, 10);
    for (const project of ["desktop", "mobile"]) {
      const f = ids(project);
      for (const role of [
        "teacher",
        "otherTeacher",
        "student",
        "outsider",
        "director",
      ] as const) {
        await db.user.create({
          data: {
            id: f[role],
            email: f.email(role),
            name: `Teste ${role} ${project}`,
            passwordHash,
            role:
              role === "director"
                ? "DIRETOR"
                : ["teacher", "otherTeacher"].includes(role)
                  ? "PROFESSOR"
                  : "ALUNO",
            ...(["teacher", "otherTeacher"].includes(role)
              ? { teacher: { create: { id: `${f[role]}_profile` } } }
              : role === "director"
                ? { director: { create: {} } }
                : {
                    student: {
                      create: {
                        id: `${f[role]}_profile`,
                        registrationNumber: f[role],
                      },
                    },
                  }),
          },
        });
      }
      await db.course.create({
        data: { id: f.course, name: "Curso E2E Java", code: f.course },
      });
      for (const [id, name, teacherId] of [
        [f.class, "Turma E2E Java", `${f.teacher}_profile`],
        [f.otherClass, "Turma E2E Privada", `${f.otherTeacher}_profile`],
      ]) {
        await db.class.create({
          data: {
            id,
            name,
            code: `${project}_${id === f.class ? "JAVA" : "PRIVATE"}`,
            courseId: f.course,
            teacherId,
            startDate: new Date("2026-01-01T12:00:00Z"),
            daysOfWeek: "SAB",
            scheduleTime: "08:30 - 12:30",
          },
        });
      }
      await db.enrollment.createMany({
        data: [
          { classId: f.class, studentId: `${f.student}_profile` },
          { classId: f.otherClass, studentId: `${f.outsider}_profile` },
        ],
      });
      for (const [id, lessonNumber, title] of [
        [f.lesson, 1, "Herança em Java"],
        [f.emptyLesson, 2, "Aula sem materiais"],
      ] as const) {
        await db.lesson.create({
          data: {
            id,
            lessonNumber,
            title,
            classId: f.class,
            teacherId: `${f.teacher}_profile`,
            date: new Date("2026-01-03T12:00:00Z"),
            scheduleTime: "08:30 - 12:30",
            plannedContent: "",
            status: "COMPLETED",
          },
        });
      }
      // A real, empty auction item avoids unrelated automatic demo seeding on dashboards.
      await db.auctionSeason.create({
        data: {
          id: `${f.prefix}_season`,
          title: "Temporada E2E",
          endsAt: new Date("2099-01-01T12:00:00Z"),
          items: {
            create: {
              title: "Item E2E",
              category: "Teste",
              description: "Dado de teste",
              endsAt: new Date("2099-01-01T12:00:00Z"),
            },
          },
        },
      });
    }
  } finally {
    await db.$disconnect();
  }
}
