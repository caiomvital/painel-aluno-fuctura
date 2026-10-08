import { PrismaClient } from "@prisma/client";
import { assertTestDatabase } from "../helpers/database";
export const db = new PrismaClient({
  datasources: {
    db: { url: assertTestDatabase(process.env.TEST_DATABASE_URL) },
  },
});
export const password = "Fuctura-e2e-only-789!";
export function ids(project: string) {
  if (
    !/^e2e_[a-f0-9]{32}$/.test(process.env.TEST_RUN_ID || "") ||
    !["desktop", "mobile"].includes(project)
  )
    throw new Error("Identidade de execução de teste ausente.");
  const prefix = `${process.env.TEST_RUN_ID}_${project}`;
  return {
    prefix,
    course: `${prefix}_course`,
    class: `${prefix}_class`,
    otherClass: `${prefix}_otherclass`,
    lesson: `${prefix}_lesson`,
    emptyLesson: `${prefix}_empty`,
    m9Lesson: `${prefix}_m9lesson`,
    m9RejectLesson: `${prefix}_m9rejectlesson`,
    m9Attendance: `${prefix}_m9attendance`,
    m9Rejection: `${prefix}_m9rejection`,
    m8Lesson: `${prefix}_m8lesson`,
    futureLesson: `${prefix}_future`,
    attendance: `${prefix}_attendance`,
    rejection: `${prefix}_rejection`,
    teacher: `${prefix}_teacher`,
    otherTeacher: `${prefix}_otherteacher`,
    student: `${prefix}_student`,
    outsider: `${prefix}_outsider`,
    director: `${prefix}_director`,
    email: (role: string) => `${prefix}_${role.toLowerCase()}@example.test`,
  };
}
