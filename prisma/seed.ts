// prisma/seed.ts
import { prisma } from '../lib/prisma';
import {
  INITIAL_USERS,
  INITIAL_DIRECTORS,
  INITIAL_TEACHERS,
  INITIAL_STUDENTS,
  INITIAL_COURSES,
  INITIAL_CLASSES,
  INITIAL_ENROLLMENTS,
  INITIAL_LESSONS,
  INITIAL_ATTENDANCES,
  INITIAL_STREAKS,
  INITIAL_BADGES,
  INITIAL_STUDENT_BADGES,
  INITIAL_POINT_TRANSACTIONS,
  INITIAL_GAMIFICATION_RULES,
} from '../lib/db/seed-data';

async function main() {
  console.log('Iniciando seed idempotente do banco de dados PostgreSQL...');

  // 1. Regras de Gamificação
  for (const rule of INITIAL_GAMIFICATION_RULES) {
    await prisma.gamificationRule.upsert({
      where: { code: rule.code },
      update: {
        name: rule.name,
        xpValue: rule.xpValue,
        description: rule.description,
        isActive: rule.isActive,
      },
      create: {
        id: rule.id,
        code: rule.code,
        name: rule.name,
        xpValue: rule.xpValue,
        description: rule.description,
        isActive: rule.isActive,
      },
    });
  }
  console.log(`- Gamification Rules: ${INITIAL_GAMIFICATION_RULES.length} sincronizadas.`);

  // 2. Badges
  for (const badge of INITIAL_BADGES) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: {
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        conditionRule: badge.conditionRule,
        xpReward: badge.xpReward,
      },
      create: {
        id: badge.id,
        code: badge.code,
        name: badge.name,
        description: badge.description,
        icon: badge.icon,
        conditionRule: badge.conditionRule,
        xpReward: badge.xpReward,
      },
    });
  }
  console.log(`- Badges: ${INITIAL_BADGES.length} sincronizadas.`);

  // 3. Usuários e Perfis
  for (const user of INITIAL_USERS) {
    const upsertedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role as any,
        passwordHash: user.passwordHash,
        avatarUrl: user.avatarUrl,
      },
      create: {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        name: user.name,
        role: user.role as any,
        avatarUrl: user.avatarUrl,
      },
    });

    await prisma.profile.upsert({
      where: { userId: upsertedUser.id },
      update: {
        bio: `Perfil institucional de ${upsertedUser.name} no Portal Fuctura Tecnologia.`,
      },
      create: {
        userId: upsertedUser.id,
        bio: `Perfil institucional de ${upsertedUser.name} no Portal Fuctura Tecnologia.`,
      },
    });
  }
  console.log(`- Usuários e Perfis: ${INITIAL_USERS.length} sincronizados.`);

  // 4. Diretores
  for (const dir of INITIAL_DIRECTORS) {
    await prisma.director.upsert({
      where: { userId: dir.userId },
      update: { department: dir.department },
      create: { id: dir.id, userId: dir.userId, department: dir.department },
    });
  }
  console.log(`- Diretores: ${INITIAL_DIRECTORS.length} sincronizados.`);

  // 5. Professores
  for (const teach of INITIAL_TEACHERS) {
    await prisma.teacher.upsert({
      where: { userId: teach.userId },
      update: { specialty: teach.specialty, biography: teach.biography },
      create: { id: teach.id, userId: teach.userId, specialty: teach.specialty, biography: teach.biography },
    });
  }
  console.log(`- Professores: ${INITIAL_TEACHERS.length} sincronizados.`);

  // 6. Alunos
  for (const stud of INITIAL_STUDENTS) {
    await prisma.student.upsert({
      where: { userId: stud.userId },
      update: {
        currentXp: stud.currentXp,
        level: stud.level,
        registrationNumber: stud.registrationNumber,
      },
      create: {
        id: stud.id,
        userId: stud.userId,
        registrationNumber: stud.registrationNumber,
        currentXp: stud.currentXp,
        level: stud.level,
      },
    });
  }
  console.log(`- Alunos: ${INITIAL_STUDENTS.length} sincronizados.`);

  // 7. Cursos e Módulos
  for (const course of INITIAL_COURSES) {
    const upsertedCourse = await prisma.course.upsert({
      where: { code: course.code },
      update: {
        name: course.name,
        description: course.description,
        workloadHours: course.workloadHours,
        status: course.status as any,
        category: course.category || null,
        partnerCertification: course.partnerCertification || null,
        modality: course.modality || null,
      },
      create: {
        id: course.id,
        name: course.name,
        code: course.code,
        description: course.description,
        workloadHours: course.workloadHours,
        status: course.status as any,
        category: course.category || null,
        partnerCertification: course.partnerCertification || null,
        modality: course.modality || null,
      },
    });

    if (course.modules && Array.isArray(course.modules)) {
      for (const mod of course.modules) {
        await prisma.courseModule.upsert({
          where: { id: mod.id },
          update: {
            courseId: upsertedCourse.id,
            orderIndex: mod.orderIndex,
            title: mod.title,
            description: mod.description,
            workloadHours: mod.workloadHours,
            topics: mod.topics || [],
          },
          create: {
            id: mod.id,
            courseId: upsertedCourse.id,
            orderIndex: mod.orderIndex,
            title: mod.title,
            description: mod.description,
            workloadHours: mod.workloadHours,
            topics: mod.topics || [],
          },
        });
      }
    }
  }
  console.log(`- Cursos e Módulos: ${INITIAL_COURSES.length} sincronizados.`);

  // 8. Turmas (Classes)
  for (const cls of INITIAL_CLASSES) {
    await prisma.class.upsert({
      where: { code: cls.code },
      update: {
        name: cls.name,
        courseId: cls.courseId,
        teacherId: cls.teacherId,
        startDate: new Date(cls.startDate),
        endDate: cls.endDate ? new Date(cls.endDate) : null,
        daysOfWeek: cls.daysOfWeek,
        scheduleTime: cls.scheduleTime,
        durationMinutes: cls.durationMinutes,
        lessonsPerWeek: cls.lessonsPerWeek,
        status: cls.status as any,
      },
      create: {
        id: cls.id,
        name: cls.name,
        code: cls.code,
        courseId: cls.courseId,
        teacherId: cls.teacherId,
        startDate: new Date(cls.startDate),
        endDate: cls.endDate ? new Date(cls.endDate) : null,
        daysOfWeek: cls.daysOfWeek,
        scheduleTime: cls.scheduleTime,
        durationMinutes: cls.durationMinutes,
        lessonsPerWeek: cls.lessonsPerWeek,
        status: cls.status as any,
      },
    });
  }
  console.log(`- Turmas: ${INITIAL_CLASSES.length} sincronizadas.`);

  // 9. Matrículas (Enrollments)
  for (const enr of INITIAL_ENROLLMENTS) {
    await prisma.enrollment.upsert({
      where: {
        studentId_classId: {
          studentId: enr.studentId,
          classId: enr.classId,
        },
      },
      update: { status: enr.status as any },
      create: {
        id: enr.id,
        studentId: enr.studentId,
        classId: enr.classId,
        status: enr.status as any,
        enrolledAt: new Date(enr.enrolledAt),
      },
    });
  }
  console.log(`- Matrículas: ${INITIAL_ENROLLMENTS.length} sincronizadas.`);

  // 10. Aulas (Lessons) e Conteúdos (LessonContent)
  for (const lesson of INITIAL_LESSONS) {
    await prisma.lesson.upsert({
      where: { id: lesson.id },
      update: {
        classId: lesson.classId,
        teacherId: lesson.teacherId,
        lessonNumber: lesson.lessonNumber,
        title: lesson.title,
        date: new Date(lesson.date),
        scheduleTime: lesson.scheduleTime,
        durationMinutes: lesson.durationMinutes,
        plannedContent: lesson.plannedContent,
        actualContent: lesson.actualContent,
        materials: lesson.materials,
        activities: lesson.activities,
        observations: lesson.observations,
        status: lesson.status as any,
      },
      create: {
        id: lesson.id,
        classId: lesson.classId,
        teacherId: lesson.teacherId,
        lessonNumber: lesson.lessonNumber,
        title: lesson.title,
        date: new Date(lesson.date),
        scheduleTime: lesson.scheduleTime,
        durationMinutes: lesson.durationMinutes,
        plannedContent: lesson.plannedContent,
        actualContent: lesson.actualContent,
        materials: lesson.materials,
        activities: lesson.activities,
        observations: lesson.observations,
        status: lesson.status as any,
      },
    });

    // Conteúdo planejado estruturado
    await prisma.lessonContent.upsert({
      where: { id: `lc_plan_${lesson.id}` },
      update: {
        title: `Conteúdo Programático: ${lesson.title}`,
        description: lesson.plannedContent,
        contentType: 'PLANNED',
      },
      create: {
        id: `lc_plan_${lesson.id}`,
        lessonId: lesson.id,
        title: `Conteúdo Programático: ${lesson.title}`,
        description: lesson.plannedContent,
        contentType: 'PLANNED',
        orderIndex: 1,
      },
    });

    if (lesson.actualContent) {
      await prisma.lessonContent.upsert({
        where: { id: `lc_taught_${lesson.id}` },
        update: {
          title: `Conteúdo Ministrado em Sala: ${lesson.title}`,
          description: lesson.actualContent,
          contentType: 'TAUGHT',
        },
        create: {
          id: `lc_taught_${lesson.id}`,
          lessonId: lesson.id,
          title: `Conteúdo Ministrado em Sala: ${lesson.title}`,
          description: lesson.actualContent,
          contentType: 'TAUGHT',
          orderIndex: 2,
        },
      });
    }
  }
  console.log(`- Aulas e Conteúdos: ${INITIAL_LESSONS.length} sincronizados.`);

  // 11. Presenças (Attendances)
  for (const att of INITIAL_ATTENDANCES) {
    await prisma.attendance.upsert({
      where: {
        lessonId_studentId: {
          lessonId: att.lessonId,
          studentId: att.studentId,
        },
      },
      update: {
        status: att.status as any,
        confirmedAt: att.confirmedAt ? new Date(att.confirmedAt) : null,
        confirmedById: att.confirmedById,
        rejectionReason: att.rejectionReason,
        justificationReason: att.justificationReason || null,
      },
      create: {
        id: att.id,
        lessonId: att.lessonId,
        studentId: att.studentId,
        status: att.status as any,
        requestedAt: new Date(att.requestedAt),
        confirmedAt: att.confirmedAt ? new Date(att.confirmedAt) : null,
        confirmedById: att.confirmedById,
        rejectionReason: att.rejectionReason,
        justificationReason: att.justificationReason || null,
      },
    });
  }
  console.log(`- Presenças: ${INITIAL_ATTENDANCES.length} sincronizadas.`);

  // 12. Streaks
  for (const str of INITIAL_STREAKS) {
    await prisma.streak.upsert({
      where: { studentId: str.studentId },
      update: {
        currentStreak: str.currentStreak,
        maxStreak: str.maxStreak,
        lastAttendedLessonId: str.lastAttendedLessonId,
        lastAttendedDate: str.lastAttendedDate ? new Date(str.lastAttendedDate) : null,
      },
      create: {
        id: str.id,
        studentId: str.studentId,
        currentStreak: str.currentStreak,
        maxStreak: str.maxStreak,
        lastAttendedLessonId: str.lastAttendedLessonId,
        lastAttendedDate: str.lastAttendedDate ? new Date(str.lastAttendedDate) : null,
      },
    });
  }
  console.log(`- Streaks: ${INITIAL_STREAKS.length} sincronizados.`);

  // 13. Conquistas dos Alunos (StudentBadges)
  for (const sb of INITIAL_STUDENT_BADGES) {
    await prisma.studentBadge.upsert({
      where: {
        studentId_badgeId: {
          studentId: sb.studentId,
          badgeId: sb.badgeId,
        },
      },
      update: {
        earnedAt: new Date(sb.earnedAt),
      },
      create: {
        id: sb.id,
        studentId: sb.studentId,
        badgeId: sb.badgeId,
        earnedAt: new Date(sb.earnedAt),
      },
    });
  }
  console.log(`- Conquistas dos Alunos: ${INITIAL_STUDENT_BADGES.length} sincronizadas.`);

  // 14. Transações de Pontos (PointTransactions)
  for (const pt of INITIAL_POINT_TRANSACTIONS) {
    await prisma.pointTransaction.upsert({
      where: { id: pt.id },
      update: {
        amount: pt.amount,
        type: pt.type as any,
        description: pt.description,
        originReference: pt.originReference,
        createdAt: new Date(pt.createdAt),
      },
      create: {
        id: pt.id,
        studentId: pt.studentId,
        amount: pt.amount,
        type: pt.type as any,
        description: pt.description,
        originReference: pt.originReference,
        createdAt: new Date(pt.createdAt),
      },
    });
  }
  console.log(`- Transações de Pontos: ${INITIAL_POINT_TRANSACTIONS.length} sincronizadas.`);

  console.log('Seed completo e idempotente finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro ao executar seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
