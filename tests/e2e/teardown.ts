import { db, ids } from "./data";
export default async function teardown() {
  try {
    for (const project of ["desktop", "mobile"]) {
      const f = ids(project);
      await db.course.deleteMany({ where: { id: f.course } });
      await db.auctionSeason.deleteMany({
        where: { id: `${f.prefix}_season` },
      });
      await db.user.deleteMany({
        where: {
          id: {
            in: [f.teacher, f.otherTeacher, f.student, f.outsider, f.director],
          },
        },
      });
    }
  } finally {
    await db.$disconnect();
  }
}
