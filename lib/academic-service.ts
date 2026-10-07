// lib/academic-service.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

// ==========================================
// 1. AUTENTICAÇÃO E XP DE LOGIN (FASE 1 & 10)
// ==========================================

export async function awardDailyLoginXp(studentId: string): Promise<{ awarded: boolean; xpAmount: number }> {
  const todayStr = new Date().toISOString().split('T')[0];
  const originRef = `LOGIN_${studentId}_${todayStr}`;

  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Obter regra de gamificação vigente
      const rule = await tx.gamificationRule.findUnique({
        where: { code: 'XP_LOGIN' },
      });

      if (!rule || !rule.isActive || rule.xpValue <= 0) {
        return { awarded: false, xpAmount: 0 };
      }

      const xpAmount = rule.xpValue;

      // 2. Verificar se o aluno já recebeu XP de login hoje (consulta direta pela chave única)
      const existingTx = await tx.pointTransaction.findUnique({
        where: {
          studentId_originReference: {
            studentId,
            originReference: originRef,
          },
        },
      });

      if (existingTx) {
        return { awarded: false, xpAmount: 0 };
      }

      // 3. Criar a PointTransaction de LOGIN (protegida pela constraint @@unique([studentId, originReference]))
      await tx.pointTransaction.create({
        data: {
          studentId,
          amount: xpAmount,
          type: 'LOGIN',
          description: `XP por acesso diário (${todayStr})`,
          originReference: originRef,
        },
      });

      // 3.1 FASE 11 & 12: Criar a CoinTransaction de LOGIN (1 XP = 1 Coin)
      await tx.coinTransaction.create({
        data: {
          studentId,
          amount: xpAmount,
          type: 'EARNED',
          description: `Coins por acesso diário (${todayStr})`,
          originReference: originRef,
        },
      });

      // 4. Atualizar Student.currentXp e Student.coinBalance na mesma transação
      const student = await tx.student.update({
        where: { id: studentId },
        data: {
          currentXp: { increment: xpAmount },
          coinBalance: { increment: xpAmount },
        },
      });

      // Atualizar nível caso necessário
      const newLevel = Math.floor(student.currentXp / 300) + 1;
      if (newLevel !== student.level) {
        await tx.student.update({
          where: { id: studentId },
          data: { level: newLevel },
        });
      }

      return { awarded: true, xpAmount };
    });
  } catch (error: any) {
    // Tratar violação de constraint única concorrente como "já concedido" sem estourar 500
    if (error?.code === 'P2002' || error?.message?.includes('Unique constraint')) {
      return { awarded: false, xpAmount: 0 };
    }
    throw error;
  }
}

// Reconciliação histórica do baseline de XP (auditabilidade do ledger)
export async function reconcileHistoricalXpBaseline(): Promise<{
  created: Array<{ studentId: string; baselineAmount: number }>;
  skipped: string[];
}> {
  const students = await prisma.student.findMany({ orderBy: { id: 'asc' } });
  const created: Array<{ studentId: string; baselineAmount: number }> = [];
  const skipped: string[] = [];

  for (const student of students) {
    const originRef = `INITIAL_XP_BASELINE_${student.id}`;

    // Idempotência: verificar se já existe a transação de baseline
    const existing = await prisma.pointTransaction.findUnique({
      where: {
        studentId_originReference: {
          studentId: student.id,
          originReference: originRef,
        },
      },
    });

    if (existing) {
      skipped.push(student.id);
      continue;
    }

    // baseline = currentXp - SUM(PointTransaction.amount)
    const agg = await prisma.pointTransaction.aggregate({
      where: { studentId: student.id },
      _sum: { amount: true },
    });
    const currentSum = agg._sum.amount || 0;
    const baseline = student.currentXp - currentSum;

    if (baseline !== 0) {
      try {
        await prisma.pointTransaction.create({
          data: {
            studentId: student.id,
            amount: baseline,
            type: 'MANUAL',
            description: 'Saldo inicial histórico importado na implantação do sistema',
            originReference: originRef,
          },
        });
        created.push({ studentId: student.id, baselineAmount: baseline });
      } catch (err: any) {
        if (err?.code === 'P2002') {
          skipped.push(student.id);
        } else {
          throw err;
        }
      }
    } else {
      skipped.push(student.id);
    }
  }

  return { created, skipped };
}

// ==========================================
// 2. DASHBOARD DO ALUNO (FASE 2)
// ==========================================

export async function getStudentDashboard(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { student: true },
  });

  if (!user || user.role !== 'ALUNO' || !user.student) {
    return {
      student: null,
      course: null,
      classInfo: null,
      progress: { progressPercent: 0, completedLessonsCount: 0, totalLessonsCount: 0 },
      lastLesson: null,
      nextLesson: null,
      missedLessons: [],
      ranking: [],
      badges: [],
      recentTransactions: [],
      lessons: [],
    };
  }

  const student = user.student;

  // Matrícula ativa e Turma
  const enrollment = await prisma.enrollment.findFirst({
    where: { studentId: student.id, status: 'ACTIVE' },
    include: {
      class: {
        include: {
          course: {
            include: {
              modules: {
                orderBy: { orderIndex: 'asc' },
              },
            },
          },
          teacher: {
            include: { user: true },
          },
          lessons: {
            include: { contents: true },
            orderBy: { lessonNumber: 'asc' },
          },
        },
      },
    },
  });

  const studentClass = enrollment?.class || null;
  const course = studentClass?.course || null;
  const teacherUser = studentClass?.teacher?.user || null;
  const classLessons = studentClass?.lessons || [];

  const completedLessons = classLessons.filter((l) => l.status === 'COMPLETED');
  const scheduledLessons = classLessons.filter((l) => l.status === 'SCHEDULED' || l.status === 'IN_PROGRESS');

  const lastLesson = completedLessons.length > 0 ? completedLessons[completedLessons.length - 1] : null;
  const nextLesson = scheduledLessons.length > 0 ? scheduledLessons[0] : null;

  // Presenças do aluno
  const studentAttendances = await prisma.attendance.findMany({
    where: { studentId: student.id },
  });
  const confirmedAttendances = studentAttendances.filter((a) => a.status === 'PRESENT');

  // Streak
  const streakRecord = await prisma.streak.findUnique({
    where: { studentId: student.id },
  });
  const streak = streakRecord ? streakRecord.currentStreak : 0;

  // Ranking na Turma
  let rankingPosition = 1;
  let totalInClass = 1;
  let classRanking: Array<{ id: string; name: string; xp: number; position: number; isCurrentUser: boolean }> = [];

  if (studentClass) {
    const classEnrollments = await prisma.enrollment.findMany({
      where: { classId: studentClass.id, status: 'ACTIVE' },
      include: {
        student: {
          include: { user: true },
        },
      },
    });

    totalInClass = classEnrollments.length;

    const sortedStudents = classEnrollments
      .map((e) => e.student)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => b.currentXp - a.currentXp);

    classRanking = sortedStudents.map((s, index) => ({
      id: s.id,
      name: s.user ? s.user.name : 'Aluno',
      xp: s.currentXp,
      position: index + 1,
      isCurrentUser: s.id === student.id,
    }));

    const userEntry = classRanking.find((r) => r.isCurrentUser);
    if (userEntry) {
      rankingPosition = userEntry.position;
    }
  }

  // Progresso do curso e frequência
  const totalLessons = classLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;
  const attendanceRate = completedLessons.length > 0 ? Math.round((confirmedAttendances.length / completedLessons.length) * 100) : 100;

  // Badges conquistadas
  const allBadges = await prisma.badge.findMany({
    orderBy: { code: 'asc' },
  });
  const myStudentBadges = await prisma.studentBadge.findMany({
    where: { studentId: student.id },
  });
  const earnedBadgeMap = new Map(myStudentBadges.map((sb) => [sb.badgeId, sb.earnedAt]));

  const formattedBadges = allBadges.map((b) => ({
    id: b.id,
    code: b.code,
    name: b.name,
    description: b.description,
    icon: b.icon,
    conditionRule: b.conditionRule,
    xpReward: b.xpReward,
    isEarned: earnedBadgeMap.has(b.id),
    earnedAt: earnedBadgeMap.get(b.id) ? earnedBadgeMap.get(b.id)!.toISOString() : null,
  }));

  // Conteúdos perdidos
  const missedLessons = completedLessons.filter((cl) => {
    const att = studentAttendances.find((a) => a.lessonId === cl.id);
    return !att || att.status !== 'PRESENT';
  });

  const nextLessonAttendance = nextLesson ? studentAttendances.find((a) => a.lessonId === nextLesson.id) : null;

  // Transações de pontos recentes
  const recentTransactions = await prisma.pointTransaction.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: 'desc' },
    take: 6,
  });

  // FASE 18: Sumário de Coins e reservas do aluno
  const activeReservations = await prisma.coinReservation.findMany({
    where: { studentId: student.id, status: 'ACTIVE' },
  });
  const reservedCoins = activeReservations.reduce((sum, r) => sum + r.amount, 0);
  const availableCoins = Math.max(0, student.coinBalance - reservedCoins);

  return {
    student: {
      id: student.id,
      name: user.name,
      email: user.email,
      registrationNumber: student.registrationNumber,
      currentXp: student.currentXp,
      level: student.level,
      streak,
      rankingPosition,
      totalInClass,
      attendanceRate,
      coinBalance: student.coinBalance,
      reservedCoins,
      availableCoins,
    },
    course: course
      ? {
          id: course.id,
          name: course.name,
          code: course.code,
          description: course.description,
          workloadHours: course.workloadHours,
          category: course.category,
          partnerCertification: course.partnerCertification,
          modality: course.modality,
          modules: course.modules.map((m) => ({
            id: m.id,
            orderIndex: m.orderIndex,
            title: m.title,
            description: m.description,
            workloadHours: m.workloadHours,
            topics: m.topics,
          })),
        }
      : null,
    classInfo: studentClass
      ? {
          id: studentClass.id,
          name: studentClass.name,
          code: studentClass.code,
          daysOfWeek: studentClass.daysOfWeek,
          scheduleTime: studentClass.scheduleTime,
          lessonsPerWeek: studentClass.lessonsPerWeek,
          teacherName: teacherUser ? teacherUser.name : 'Professor Fuctura',
        }
      : null,
    progress: {
      progressPercent,
      completedLessonsCount: completedLessons.length,
      totalLessonsCount: totalLessons,
    },
    lastLesson: lastLesson
      ? {
          id: lastLesson.id,
          lessonNumber: lastLesson.lessonNumber,
          title: lastLesson.title,
          date: lastLesson.date.toISOString(),
          scheduleTime: lastLesson.scheduleTime,
          plannedContent: lastLesson.plannedContent,
          actualContent: lastLesson.actualContent,
          materials: lastLesson.materials,
          activities: lastLesson.activities,
        }
      : null,
    nextLesson: nextLesson
      ? {
          id: nextLesson.id,
          lessonNumber: nextLesson.lessonNumber,
          title: nextLesson.title,
          date: nextLesson.date.toISOString(),
          scheduleTime: nextLesson.scheduleTime,
          plannedContent: nextLesson.plannedContent,
          materials: nextLesson.materials,
          activities: nextLesson.activities,
          attendanceStatus: nextLessonAttendance ? nextLessonAttendance.status : null,
          canRequestAttendance: !nextLessonAttendance || nextLessonAttendance.status === 'ABSENT',
        }
      : null,
    missedLessons: missedLessons.map((ml) => ({
      id: ml.id,
      lessonNumber: ml.lessonNumber,
      title: ml.title,
      date: ml.date.toISOString(),
      plannedContent: ml.plannedContent,
      materials: ml.materials,
    })),
    ranking: classRanking.slice(0, 10),
    badges: formattedBadges,
    recentTransactions: recentTransactions.map((tx) => ({
      id: tx.id,
      studentId: tx.studentId,
      amount: tx.amount,
      type: tx.type,
      description: tx.description,
      originReference: tx.originReference,
      createdAt: tx.createdAt.toISOString(),
    })),
    lessons: classLessons.map((l) => {
      const att = studentAttendances.find((a) => a.lessonId === l.id);
      return {
        id: l.id,
        lessonNumber: l.lessonNumber,
        title: l.title,
        date: l.date.toISOString(),
        scheduleTime: l.scheduleTime,
        durationMinutes: l.durationMinutes,
        status: l.status,
        plannedContent: l.plannedContent,
        actualContent: l.actualContent,
        plannedTopics: extractPlannedTopics(l),
        taughtTopics: extractTaughtTopics(l),
        materials: l.materials,
        supportMaterials: parseMaterialsList(l.materials),
        activities: l.activities,
        attendanceStatus: att ? att.status : null,
        teacherName: teacherUser ? teacherUser.name : 'Professor Fuctura',
      };
    }),
  };
}

// ==========================================
// 3. DASHBOARD DO PROFESSOR (FASE 3)
// ==========================================

export async function getTeacherDashboard(userId: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!teacher) {
    return {
      teacher: null,
      classes: [],
      upcomingLesson: null,
      pendingAttendances: [],
    };
  }

  // Turmas do professor com alunos e aulas
  const teacherClasses = await prisma.class.findMany({
    where: { teacherId: teacher.id },
    include: {
      course: true,
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          student: {
            include: {
              user: true,
              attendances: true,
            },
          },
        },
      },
      lessons: {
        include: { contents: true },
        orderBy: { lessonNumber: 'asc' },
      },
    },
  });

  const classesData = teacherClasses.map((cls) => {
    const classLessonIds = new Set(cls.lessons.map((l) => l.id));
    const completedLessons = cls.lessons.filter((l) => l.status === 'COMPLETED');
    const scheduledLessons = cls.lessons.filter((l) => l.status === 'SCHEDULED' || l.status === 'IN_PROGRESS');
    const nextLesson = scheduledLessons.length > 0 ? scheduledLessons[0] : null;

    const students = cls.enrollments
      .map((e) => e.student)
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .map((s) => {
        const confirmedCount = s.attendances.filter(
          (a) => a.status === 'PRESENT' && classLessonIds.has(a.lessonId)
        ).length;

        return {
          id: s.id,
          name: s.user ? s.user.name : 'Aluno',
          email: s.user ? s.user.email : '',
          registrationNumber: s.registrationNumber,
          currentXp: s.currentXp,
          confirmedCount,
        };
      });

    return {
      id: cls.id,
      name: cls.name,
      code: cls.code,
      courseName: cls.course ? cls.course.name : 'Curso',
      daysOfWeek: cls.daysOfWeek,
      scheduleTime: cls.scheduleTime,
      lessonsPerWeek: cls.lessonsPerWeek,
      totalStudents: students.length,
      students,
      totalLessons: cls.lessons.length,
      completedLessonsCount: completedLessons.length,
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            lessonNumber: nextLesson.lessonNumber,
            title: nextLesson.title,
            date: nextLesson.date.toISOString(),
            scheduleTime: nextLesson.scheduleTime,
            plannedContent: nextLesson.plannedContent,
            actualContent: nextLesson.actualContent,
            plannedTopics: extractPlannedTopics(nextLesson),
            taughtTopics: extractTaughtTopics(nextLesson),
            materials: parseMaterialsList(nextLesson.materials),
          }
        : null,
      lessons: cls.lessons.map((l) => ({
        id: l.id,
        lessonNumber: l.lessonNumber,
        title: l.title,
        date: l.date.toISOString(),
        scheduleTime: l.scheduleTime,
        status: l.status,
        plannedTopics: extractPlannedTopics(l),
        taughtTopics: extractTaughtTopics(l),
        materials: parseMaterialsList(l.materials),
      })),
    };
  });

  // Próxima aula geral de todas as turmas do professor
  const teacherClassIds = teacherClasses.map((c) => c.id);
  const allScheduledLessons = await prisma.lesson.findMany({
    where: {
      classId: { in: teacherClassIds },
      status: { in: ['SCHEDULED', 'IN_PROGRESS'] },
    },
    include: { class: true },
    orderBy: { date: 'asc' },
  });

  const upcomingLesson = allScheduledLessons.length > 0 ? allScheduledLessons[0] : null;

  // Solicitações de presença pendentes para turmas deste professor
  const pendingAttendances = await prisma.attendance.findMany({
    where: {
      status: 'PENDING',
      lesson: {
        classId: { in: teacherClassIds },
      },
    },
    include: {
      lesson: {
        include: { class: true },
      },
      student: {
        include: { user: true },
      },
    },
    orderBy: { requestedAt: 'asc' },
  });

  return {
    teacher: {
      id: teacher.id,
      name: teacher.user.name,
      email: teacher.user.email,
      specialty: teacher.specialty,
      biography: teacher.biography,
    },
    classes: classesData,
    upcomingLesson: upcomingLesson
      ? {
          id: upcomingLesson.id,
          title: upcomingLesson.title,
          lessonNumber: upcomingLesson.lessonNumber,
          date: upcomingLesson.date.toISOString(),
          scheduleTime: upcomingLesson.scheduleTime,
          className: upcomingLesson.class.name,
          plannedContent: upcomingLesson.plannedContent,
        }
      : null,
    pendingAttendances: pendingAttendances.map((att) => ({
      id: att.id,
      lessonId: att.lessonId,
      lessonTitle: att.lesson.title,
      lessonNumber: att.lesson.lessonNumber,
      className: att.lesson.class.name,
      studentId: att.studentId,
      studentName: att.student.user ? att.student.user.name : 'Aluno',
      studentReg: att.student.registrationNumber,
      requestedAt: att.requestedAt.toISOString(),
    })),
  };
}

// ==========================================
// 4. DASHBOARD DO DIRETOR (FASE 4)
// ==========================================

export async function getDirectorDashboard(userId: string) {
  const directorUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { director: true },
  });

  const [totalStudents, totalTeachers, totalCourses, totalClasses] = await Promise.all([
    prisma.student.count(),
    prisma.teacher.count(),
    prisma.course.count(),
    prisma.class.count(),
  ]);

  const classes = await prisma.class.findMany({
    include: {
      course: true,
      teacher: { include: { user: true } },
      enrollments: { where: { status: 'ACTIVE' } },
      lessons: {
        include: { contents: true },
        orderBy: { lessonNumber: 'asc' },
      },
    },
    orderBy: { code: 'asc' },
  });

  const courses = await prisma.course.findMany({
    include: {
      modules: { orderBy: { orderIndex: 'asc' } },
    },
    orderBy: { name: 'asc' },
  });

  const teachers = await prisma.teacher.findMany({
    include: {
      user: true,
      classes: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const students = await prisma.student.findMany({
    include: {
      user: true,
      enrollments: {
        where: { status: 'ACTIVE' },
        include: { class: true },
      },
      streak: true,
      attendances: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const rules = await prisma.gamificationRule.findMany({
    orderBy: { code: 'asc' },
  });

  return {
    director: {
      name: directorUser ? directorUser.name : 'Diretor Fuctura',
      email: directorUser ? directorUser.email : 'diretoria@fuctura.com.br',
    },
    metrics: {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalClasses,
    },
    classes: classes.map((cls) => ({
      id: cls.id,
      name: cls.name,
      code: cls.code,
      courseId: cls.courseId,
      courseName: cls.course ? cls.course.name : 'Curso',
      teacherId: cls.teacherId,
      teacherName: cls.teacher?.user ? cls.teacher.user.name : 'Não atribuído',
      daysOfWeek: cls.daysOfWeek,
      scheduleTime: cls.scheduleTime,
      durationMinutes: cls.durationMinutes,
      lessonsPerWeek: cls.lessonsPerWeek,
      status: cls.status,
      enrolledCount: cls.enrollments.length,
      startDate: cls.startDate.toISOString(),
      endDate: cls.endDate ? cls.endDate.toISOString() : null,
      lessons: cls.lessons.map((l) => ({
        id: l.id,
        lessonNumber: l.lessonNumber,
        title: l.title,
        date: l.date.toISOString(),
        scheduleTime: l.scheduleTime,
        status: l.status,
        plannedTopics: extractPlannedTopics(l),
        taughtTopics: extractTaughtTopics(l),
        materials: parseMaterialsList(l.materials),
      })),
    })),
    courses: courses.map((c) => ({
      id: c.id,
      name: c.name,
      code: c.code,
      description: c.description,
      workloadHours: c.workloadHours,
      category: c.category,
      partnerCertification: c.partnerCertification,
      modality: c.modality,
      modules: c.modules.map((m) => ({
        id: m.id,
        orderIndex: m.orderIndex,
        title: m.title,
        description: m.description,
        workloadHours: m.workloadHours,
        topics: m.topics,
      })),
    })),
    teachers: teachers.map((t) => ({
      id: t.id,
      userId: t.userId,
      name: t.user ? t.user.name : 'Professor',
      email: t.user ? t.user.email : '',
      specialty: t.specialty,
      assignedClassesCount: t.classes.length,
      assignedClasses: t.classes.map((c) => c.name),
    })),
    students: students.map((s) => {
      const activeEnrollment = s.enrollments.length > 0 ? s.enrollments[0] : null;
      const confirmedAtts = s.attendances.filter((a) => a.status === 'PRESENT').length;
      const rate = s.attendances.length > 0 ? Math.round((confirmedAtts / s.attendances.length) * 100) : 100;

      return {
        id: s.id,
        userId: s.userId,
        name: s.user ? s.user.name : 'Aluno',
        email: s.user ? s.user.email : '',
        registrationNumber: s.registrationNumber,
        currentXp: s.currentXp,
        level: s.level,
        streak: s.streak ? s.streak.currentStreak : 0,
        classId: activeEnrollment?.class ? activeEnrollment.class.id : null,
        className: activeEnrollment?.class ? activeEnrollment.class.name : 'Sem turma atribuída',
        attendanceRate: rate,
      };
    }),
    gamificationRules: rules.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      xpValue: r.xpValue,
      description: r.description,
      isActive: r.isActive,
    })),
  };
}

// ==========================================
// 5. CRUD DE ALUNOS COM TRANSAÇÃO (FASE 5 & 11)
// ==========================================

export async function createStudentByDirector(data: {
  name: string;
  email: string;
  classId?: string;
  registrationNumber?: string;
  currentXp?: number;
}) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const initialXp = Number(data.currentXp) || 100;
  const regNumber = data.registrationNumber || `MAT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  // Senha padrão inicial hash com bcrypt (Password123!)
  const defaultPasswordHash = '$2b$10$gbSD4FDfU12pM3c67/Ynt.8YIlqbP1r2xMTvokm8QHG1zPp5WOLrW';

  return await prisma.$transaction(async (tx) => {
    // 1. Criar User
    const user = await tx.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: defaultPasswordHash,
        role: 'ALUNO',
      },
    });

    // 2. Criar Profile
    await tx.profile.create({
      data: {
        userId: user.id,
        bio: `Perfil institucional de ${user.name} no Portal Fuctura Tecnologia.`,
      },
    });

    // 3. Criar Student
    const student = await tx.student.create({
      data: {
        userId: user.id,
        registrationNumber: regNumber,
        currentXp: initialXp,
        level: Math.floor(initialXp / 300) + 1,
      },
    });

    // 4. Criar Streak inicial
    await tx.streak.create({
      data: {
        studentId: student.id,
        currentStreak: 1,
        maxStreak: 1,
        lastAttendedDate: new Date(),
      },
    });

    // 5. Matrícula se turma foi informada
    let enrolledClassName = 'Sem turma atribuída';
    if (data.classId) {
      const cls = await tx.class.findUnique({ where: { id: data.classId } });
      if (cls) {
        enrolledClassName = cls.name;
        await tx.enrollment.create({
          data: {
            studentId: student.id,
            classId: cls.id,
            status: 'ACTIVE',
          },
        });
      }
    }

    return {
      id: student.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      registrationNumber: student.registrationNumber,
      currentXp: student.currentXp,
      level: student.level,
      streak: 1,
      classId: data.classId || null,
      className: enrolledClassName,
      attendanceRate: 100,
    };
  });
}

export async function updateStudentByDirector(
  studentId: string,
  data: {
    name?: string;
    email?: string;
    classId?: string;
    registrationNumber?: string;
    currentXp?: number;
    streak?: number;
  },
  directorUserId?: string
) {
  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
      include: { user: true, streak: true },
    });

    if (!student) return null;

    // Atualizar User
    if (data.name || data.email) {
      await tx.user.update({
        where: { id: student.userId },
        data: {
          name: data.name ? data.name.trim() : undefined,
          email: data.email ? data.email.toLowerCase().trim() : undefined,
        },
      });
    }

    // FASE 11: Ajuste Manual de XP gera PointTransaction MANUAL
    let newXp = student.currentXp;
    if (typeof data.currentXp === 'number' && data.currentXp !== student.currentXp) {
      const xpDifference = data.currentXp - student.currentXp;
      newXp = data.currentXp;

      await tx.pointTransaction.create({
        data: {
          studentId: student.id,
          amount: xpDifference,
          type: 'MANUAL',
          description: `Ajuste manual de XP realizado pela Diretoria (${xpDifference >= 0 ? '+' : ''}${xpDifference} XP)`,
          originReference: `MANUAL_${randomUUID()}`,
        },
      });
    }

    // Atualizar Student
    const updatedStudent = await tx.student.update({
      where: { id: studentId },
      data: {
        registrationNumber: data.registrationNumber ? data.registrationNumber.trim() : undefined,
        currentXp: newXp,
        level: Math.floor(newXp / 300) + 1,
      },
    });

    // Atualizar Streak
    let currentStreakVal = student.streak ? student.streak.currentStreak : 0;
    if (typeof data.streak === 'number') {
      currentStreakVal = data.streak;
      if (student.streak) {
        await tx.streak.update({
          where: { studentId: student.id },
          data: {
            currentStreak: data.streak,
            maxStreak: Math.max(student.streak.maxStreak, data.streak),
          },
        });
      } else {
        await tx.streak.create({
          data: {
            studentId: student.id,
            currentStreak: data.streak,
            maxStreak: data.streak,
          },
        });
      }
    }

    // Atualizar Turma / Matrícula
    let className = 'Sem turma atribuída';
    if (data.classId !== undefined) {
      // Desativar ou remover matrículas anteriores
      await tx.enrollment.deleteMany({
        where: { studentId: student.id },
      });

      if (data.classId) {
        const cls = await tx.class.findUnique({ where: { id: data.classId } });
        if (cls) {
          className = cls.name;
          await tx.enrollment.create({
            data: {
              studentId: student.id,
              classId: cls.id,
              status: 'ACTIVE',
            },
          });
        }
      }
    } else {
      const activeEnr = await tx.enrollment.findFirst({
        where: { studentId: student.id, status: 'ACTIVE' },
        include: { class: true },
      });
      if (activeEnr?.class) {
        className = activeEnr.class.name;
      }
    }

    const finalUser = await tx.user.findUnique({ where: { id: student.userId } });

    return {
      id: updatedStudent.id,
      userId: updatedStudent.userId,
      name: finalUser ? finalUser.name : 'Aluno',
      email: finalUser ? finalUser.email : '',
      registrationNumber: updatedStudent.registrationNumber,
      currentXp: updatedStudent.currentXp,
      level: updatedStudent.level,
      streak: currentStreakVal,
      classId: data.classId || null,
      className,
    };
  });
}

export async function deleteStudentByDirector(studentId: string) {
  return await prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({
      where: { id: studentId },
    });

    if (!student) return false;

    // Respeitar integridade referencial: deletar dependências
    await tx.pointTransaction.deleteMany({ where: { studentId } });
    await tx.attendance.deleteMany({ where: { studentId } });
    await tx.studentBadge.deleteMany({ where: { studentId } });
    await tx.streak.deleteMany({ where: { studentId } });
    await tx.enrollment.deleteMany({ where: { studentId } });
    await tx.student.delete({ where: { id: studentId } });
    await tx.profile.deleteMany({ where: { userId: student.userId } });
    await tx.user.delete({ where: { id: student.userId } });

    return true;
  });
}

// ==========================================
// 6. CRUD DE PROFESSORES COM TRANSAÇÃO (FASE 6)
// ==========================================

export async function createTeacherByDirector(data: { name: string; email: string; specialty: string }) {
  const normalizedEmail = data.email.toLowerCase().trim();
  const defaultPasswordHash = '$2b$10$gbSD4FDfU12pM3c67/Ynt.8YIlqbP1r2xMTvokm8QHG1zPp5WOLrW';

  return await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: data.name.trim(),
        email: normalizedEmail,
        passwordHash: defaultPasswordHash,
        role: 'PROFESSOR',
      },
    });

    await tx.profile.create({
      data: {
        userId: user.id,
        bio: `Professor ${user.name} da Fuctura Tecnologia.`,
      },
    });

    const teacher = await tx.teacher.create({
      data: {
        userId: user.id,
        specialty: data.specialty.trim() || 'Instrutor de Tecnologia',
      },
    });

    return {
      id: teacher.id,
      userId: user.id,
      name: user.name,
      email: user.email,
      specialty: teacher.specialty,
    };
  });
}

export async function updateTeacherByDirector(
  teacherId: string,
  data: { name?: string; email?: string; specialty?: string }
) {
  return await prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    if (!teacher) return null;

    if (data.name || data.email) {
      await tx.user.update({
        where: { id: teacher.userId },
        data: {
          name: data.name ? data.name.trim() : undefined,
          email: data.email ? data.email.toLowerCase().trim() : undefined,
        },
      });
    }

    if (data.specialty) {
      await tx.teacher.update({
        where: { id: teacherId },
        data: { specialty: data.specialty.trim() },
      });
    }

    const updatedTeacher = await tx.teacher.findUnique({
      where: { id: teacherId },
      include: { user: true },
    });

    return {
      id: updatedTeacher!.id,
      userId: updatedTeacher!.userId,
      name: updatedTeacher!.user.name,
      email: updatedTeacher!.user.email,
      specialty: updatedTeacher!.specialty,
    };
  });
}

export async function deleteTeacherByDirector(teacherId: string) {
  return await prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({
      where: { id: teacherId },
    });

    if (!teacher) return false;

    // Tratar turmas vinculadas de forma segura (desvincular o professor para não deixar registros órfãos)
    await tx.class.updateMany({
      where: { teacherId },
      data: { teacherId: null },
    });

    await tx.lesson.updateMany({
      where: { teacherId },
      data: { teacherId: null },
    });

    await tx.teacher.delete({ where: { id: teacherId } });
    await tx.profile.deleteMany({ where: { userId: teacher.userId } });
    await tx.user.delete({ where: { id: teacher.userId } });

    return true;
  });
}

// ==========================================
// 7. CRUD DE TURMAS (FASE 7)
// ==========================================

export async function createClassByDirector(data: {
  name: string;
  code: string;
  courseId: string;
  teacherId?: string | null;
  daysOfWeek: string;
  scheduleTime: string;
  durationMinutes: number;
  lessonsPerWeek: number;
  startDate?: string;
  endDate?: string | null;
}) {
  // Validar referências de Course e Teacher no servidor
  const course = await prisma.course.findUnique({
    where: { id: data.courseId },
  });
  if (!course) {
    throw new Error('Curso selecionado não foi encontrado no sistema.');
  }

  if (data.teacherId) {
    const teacher = await prisma.teacher.findUnique({
      where: { id: data.teacherId },
    });
    if (!teacher) {
      throw new Error('Professor selecionado não foi encontrado no sistema.');
    }
  }

  const newClass = await prisma.class.create({
    data: {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      courseId: data.courseId,
      teacherId: data.teacherId || null,
      daysOfWeek: data.daysOfWeek,
      scheduleTime: data.scheduleTime,
      durationMinutes: data.durationMinutes || 180,
      lessonsPerWeek: data.lessonsPerWeek || 1,
      startDate: data.startDate ? new Date(data.startDate) : new Date(),
      endDate: data.endDate ? new Date(data.endDate) : null,
      status: 'ACTIVE',
    },
    include: {
      course: true,
      teacher: { include: { user: true } },
    },
  });

  return {
    id: newClass.id,
    name: newClass.name,
    code: newClass.code,
    courseId: newClass.courseId,
    courseName: newClass.course.name,
    teacherId: newClass.teacherId,
    teacherName: newClass.teacher?.user ? newClass.teacher.user.name : 'Não atribuído',
    daysOfWeek: newClass.daysOfWeek,
    scheduleTime: newClass.scheduleTime,
    durationMinutes: newClass.durationMinutes,
    lessonsPerWeek: newClass.lessonsPerWeek,
    status: newClass.status,
    enrolledCount: 0,
    startDate: newClass.startDate.toISOString(),
    endDate: newClass.endDate ? newClass.endDate.toISOString() : null,
  };
}

export async function updateClassByDirector(classId: string, data: any) {
  if (data.courseId) {
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw new Error('Curso inválido.');
  }

  if (data.teacherId) {
    const teacher = await prisma.teacher.findUnique({ where: { id: data.teacherId } });
    if (!teacher) throw new Error('Professor inválido.');
  }

  const updated = await prisma.class.update({
    where: { id: classId },
    data: {
      name: data.name ? data.name.trim() : undefined,
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      courseId: data.courseId,
      teacherId: data.teacherId === undefined ? undefined : data.teacherId,
      daysOfWeek: data.daysOfWeek,
      scheduleTime: data.scheduleTime,
      durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : undefined,
      lessonsPerWeek: data.lessonsPerWeek ? Number(data.lessonsPerWeek) : undefined,
      status: data.status,
    },
    include: {
      course: true,
      teacher: { include: { user: true } },
      enrollments: { where: { status: 'ACTIVE' } },
    },
  });

  return {
    id: updated.id,
    name: updated.name,
    code: updated.code,
    courseId: updated.courseId,
    courseName: updated.course ? updated.course.name : 'Curso',
    teacherId: updated.teacherId,
    teacherName: updated.teacher?.user ? updated.teacher.user.name : 'Não atribuído',
    daysOfWeek: updated.daysOfWeek,
    scheduleTime: updated.scheduleTime,
    durationMinutes: updated.durationMinutes,
    lessonsPerWeek: updated.lessonsPerWeek,
    status: updated.status,
    enrolledCount: updated.enrollments.length,
    startDate: updated.startDate.toISOString(),
    endDate: updated.endDate ? updated.endDate.toISOString() : null,
  };
}

export async function deleteClassByDirector(classId: string) {
  return await prisma.$transaction(async (tx) => {
    const cls = await tx.class.findUnique({ where: { id: classId } });
    if (!cls) return false;

    // Remover dependências de matrículas, aulas e frequências
    const lessons = await tx.lesson.findMany({ where: { classId } });
    const lessonIds = lessons.map((l) => l.id);

    await tx.attendance.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await tx.lessonContent.deleteMany({ where: { lessonId: { in: lessonIds } } });
    await tx.lesson.deleteMany({ where: { classId } });
    await tx.enrollment.deleteMany({ where: { classId } });
    await tx.class.delete({ where: { id: classId } });

    return true;
  });
}

// ==========================================
// 8 & 9. PRESENÇA ATÔMICA E IDEMPOTENTE (FASE 8 & 9)
// ==========================================

export async function requestStudentAttendance(lessonId: string, studentUserId: string) {
  const student = await prisma.student.findUnique({
    where: { userId: studentUserId },
  });

  if (!student) {
    throw new Error('Apenas alunos matriculados podem solicitar presença.');
  }

  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
  });

  if (!lesson) {
    throw new Error('Aula não encontrada.');
  }

  // A constraint @@unique([lessonId, studentId]) garante unicidade
  const attendance = await prisma.attendance.upsert({
    where: {
      lessonId_studentId: {
        lessonId,
        studentId: student.id,
      },
    },
    update: {
      status: 'PENDING',
      requestedAt: new Date(),
    },
    create: {
      lessonId,
      studentId: student.id,
      status: 'PENDING',
      requestedAt: new Date(),
    },
  });

  return {
    id: attendance.id,
    lessonId: attendance.lessonId,
    studentId: attendance.studentId,
    status: attendance.status,
    requestedAt: attendance.requestedAt.toISOString(),
  };
}

export async function confirmTeacherAttendance(attendanceId: string, teacherUserId: string) {
  return await prisma.$transaction(async (tx) => {
    const teacher = await tx.teacher.findUnique({
      where: { userId: teacherUserId },
    });

    if (!teacher) {
      throw new Error('Não autorizado. Apenas o professor responsável pode confirmar presença.');
    }

    const attendance = await tx.attendance.findUnique({
      where: { id: attendanceId },
      include: {
        lesson: {
          include: { class: true },
        },
      },
    });

    if (!attendance) {
      throw new Error('Registro de presença não encontrado.');
    }

    if (attendance.lesson.class.teacherId !== teacher.id) {
      throw new Error('Você só pode confirmar presença de alunos das suas próprias turmas.');
    }

    // FASE 9: IDEMPOTÊNCIA
    // Confirmar novamente uma presença já PRESENT não pode:
    // - gerar XP novamente;
    // - criar nova PointTransaction;
    // - incrementar streak novamente.
    if (attendance.status === 'PRESENT') {
      return {
        id: attendance.id,
        lessonId: attendance.lessonId,
        studentId: attendance.studentId,
        status: attendance.status,
        confirmedAt: attendance.confirmedAt?.toISOString() || new Date().toISOString(),
      };
    }

    // 1. Atualizar Attendance de PENDING para PRESENT
    const updatedAttendance = await tx.attendance.update({
      where: { id: attendanceId },
      data: {
        status: 'PRESENT',
        confirmedAt: new Date(),
        confirmedById: teacherUserId,
      },
    });

    // 2. Obter GamificationRule de presença vigente
    const rule = await tx.gamificationRule.findUnique({
      where: { code: 'XP_ATTENDANCE' },
    });
    const xpValue = rule && rule.isActive ? rule.xpValue : 20;

    // 3. Criar PointTransaction se ainda não existir
    const existingTx = await tx.pointTransaction.findFirst({
      where: {
        studentId: attendance.studentId,
        originReference: attendance.lessonId,
      },
    });

    if (!existingTx && xpValue > 0) {
      await tx.pointTransaction.create({
        data: {
          studentId: attendance.studentId,
          amount: xpValue,
          type: 'ATTENDANCE',
          description: `Presença confirmada: Aula ${attendance.lesson.lessonNumber} - ${attendance.lesson.title}`,
          originReference: attendance.lessonId,
        },
      });

      // FASE 11 & 13: Conceder Coins na mesma transação (1 XP = 1 Coin)
      await tx.coinTransaction.create({
        data: {
          studentId: attendance.studentId,
          amount: xpValue,
          type: 'EARNED',
          description: `Coins por presença confirmada: Aula ${attendance.lesson.lessonNumber} - ${attendance.lesson.title}`,
          originReference: attendance.lessonId,
        },
      });

      // 4. Atualizar Student.currentXp e Student.coinBalance
      const updatedStudent = await tx.student.update({
        where: { id: attendance.studentId },
        data: {
          currentXp: { increment: xpValue },
          coinBalance: { increment: xpValue },
        },
      });

      const newLevel = Math.floor(updatedStudent.currentXp / 300) + 1;
      if (newLevel !== updatedStudent.level) {
        await tx.student.update({
          where: { id: attendance.studentId },
          data: { level: newLevel },
        });
      }
    }

    // 5. Atualizar Streak
    const existingStreak = await tx.streak.findUnique({
      where: { studentId: attendance.studentId },
    });

    if (existingStreak) {
      const nextStreak = existingStreak.currentStreak + 1;
      await tx.streak.update({
        where: { studentId: attendance.studentId },
        data: {
          currentStreak: nextStreak,
          maxStreak: Math.max(existingStreak.maxStreak, nextStreak),
          lastAttendedLessonId: attendance.lessonId,
          lastAttendedDate: new Date(),
        },
      });
    } else {
      await tx.streak.create({
        data: {
          studentId: attendance.studentId,
          currentStreak: 1,
          maxStreak: 1,
          lastAttendedLessonId: attendance.lessonId,
          lastAttendedDate: new Date(),
        },
      });
    }

    return {
      id: updatedAttendance.id,
      lessonId: updatedAttendance.lessonId,
      studentId: updatedAttendance.studentId,
      status: updatedAttendance.status,
      confirmedAt: updatedAttendance.confirmedAt?.toISOString() || new Date().toISOString(),
    };
  });
}

export async function rejectTeacherAttendance(attendanceId: string, teacherUserId: string, reason?: string) {
  const teacher = await prisma.teacher.findUnique({
    where: { userId: teacherUserId },
  });

  if (!teacher) {
    throw new Error('Não autorizado.');
  }

  const attendance = await prisma.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      lesson: { include: { class: true } },
    },
  });

  if (!attendance) {
    throw new Error('Registro de presença não encontrado.');
  }

  if (attendance.lesson.class.teacherId !== teacher.id) {
    throw new Error('Você só pode recusar presença de alunos das suas próprias turmas.');
  }

  const updated = await prisma.attendance.update({
    where: { id: attendanceId },
    data: {
      status: 'ABSENT',
      confirmedAt: null,
      confirmedById: teacherUserId,
      rejectionReason: reason || 'Não compareceu à aula ou horário expirado.',
    },
  });

  return {
    id: updated.id,
    lessonId: updated.lessonId,
    studentId: updated.studentId,
    status: updated.status,
    rejectionReason: updated.rejectionReason,
  };
}

// ==========================================
// 8. ADMINISTRAÇÃO DE FREQUÊNCIA (PROFESSOR & DIRETOR)
// ==========================================

export async function getStudentAttendanceHistory(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: true,
      streak: true,
      enrollments: {
        where: { status: 'ACTIVE' },
        include: {
          class: {
            include: {
              course: true,
              teacher: { include: { user: true } },
              lessons: {
                orderBy: { lessonNumber: 'desc' },
              },
            },
          },
        },
      },
    },
  });

  if (!student) {
    throw new Error('Aluno não encontrado.');
  }

  const activeEnrollment = student.enrollments.length > 0 ? student.enrollments[0] : null;
  const studentClass = activeEnrollment?.class || null;
  const course = studentClass?.course || null;
  const teacherUser = studentClass?.teacher?.user || null;
  const classLessons = studentClass?.lessons || [];

  const studentAttendances = await prisma.attendance.findMany({
    where: { studentId: student.id },
  });

  let presentCount = 0;
  let absentCount = 0;
  let justifiedCount = 0;

  const lessons = classLessons.map((l) => {
    const att = studentAttendances.find((a) => a.lessonId === l.id);
    let normalizedStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED' | 'PENDING' = 'PENDING';

    if (att) {
      if (att.status === 'PRESENT') {
        normalizedStatus = 'PRESENT';
        presentCount++;
      } else if (att.status === 'EXCUSED') {
        normalizedStatus = 'EXCUSED';
        justifiedCount++;
      } else if (att.status === 'ABSENT') {
        normalizedStatus = 'ABSENT';
        absentCount++;
      } else {
        normalizedStatus = 'PENDING';
      }
    } else {
      if (l.status === 'COMPLETED') {
        normalizedStatus = 'ABSENT';
        absentCount++;
      } else {
        normalizedStatus = 'PENDING';
      }
    }

    return {
      id: l.id,
      attendanceId: att ? att.id : null,
      lessonNumber: l.lessonNumber,
      title: l.title,
      date: l.date.toISOString(),
      scheduleTime: l.scheduleTime,
      lessonStatus: l.status,
      status: normalizedStatus,
      rawStatus: att ? att.status : null,
      justificationReason: att?.justificationReason || att?.rejectionReason || null,
      confirmedAt: att?.confirmedAt ? att.confirmedAt.toISOString() : null,
      confirmedByName: normalizedStatus === 'PRESENT' ? (teacherUser ? teacherUser.name : 'Professor') : null,
      plannedContent: l.plannedContent,
      actualContent: l.actualContent || null,
      materials: l.materials || null,
    };
  });

  const totalFinished = presentCount + absentCount + justifiedCount;
  const attendanceRate = totalFinished > 0 ? Math.round((presentCount / totalFinished) * 100) : 100;

  return {
    student: {
      id: student.id,
      name: student.user.name,
      email: student.user.email,
      registrationNumber: student.registrationNumber,
      currentXp: student.currentXp,
      level: student.level,
      streak: student.streak ? student.streak.currentStreak : 0,
      attendanceRate,
    },
    classInfo: {
      id: studentClass?.id || '',
      name: studentClass?.name || 'Turma',
      code: studentClass?.code || '',
      courseName: course?.name || 'Curso',
      teacherName: teacherUser ? teacherUser.name : 'Professor Fuctura',
      scheduleTime: studentClass?.scheduleTime || '',
      daysOfWeek: studentClass?.daysOfWeek || '',
    },
    metrics: {
      totalLessons: classLessons.length,
      presentCount,
      absentCount,
      justifiedCount,
      pendingCount: lessons.filter((l) => l.status === 'PENDING').length,
      attendanceRate,
    },
    lessons,
  };
}

export async function updateStudentAttendanceRecord(params: {
  studentId: string;
  lessonId: string;
  status: 'PRESENT' | 'ABSENT' | 'EXCUSED';
  justificationReason?: string;
  actorUserId: string;
}) {
  const { studentId, lessonId, status, justificationReason, actorUserId } = params;

  return await prisma.$transaction(async (tx) => {
    const existing = await tx.attendance.findUnique({
      where: {
        lessonId_studentId: {
          lessonId,
          studentId,
        },
      },
    });

    let updatedAttendance;
    if (!existing) {
      updatedAttendance = await tx.attendance.create({
        data: {
          lessonId,
          studentId,
          status,
          requestedAt: new Date(),
          confirmedAt: status === 'PRESENT' ? new Date() : null,
          confirmedById: actorUserId,
          justificationReason: justificationReason || null,
          rejectionReason: status === 'ABSENT' ? (justificationReason || 'Ausência confirmada') : null,
        },
      });
    } else {
      updatedAttendance = await tx.attendance.update({
        where: { id: existing.id },
        data: {
          status,
          confirmedAt: status === 'PRESENT' ? new Date() : null,
          confirmedById: actorUserId,
          justificationReason: justificationReason || null,
          rejectionReason: status === 'ABSENT' ? (justificationReason || 'Ausência confirmada') : null,
        },
      });
    }

    // Se alterou para PRESENT e o aluno ainda não tinha recebido XP por essa aula:
    if (status === 'PRESENT') {
      const alreadyHasXp = await tx.pointTransaction.findFirst({
        where: {
          studentId,
          originReference: lessonId,
        },
      });

      if (!alreadyHasXp) {
        const rule = await tx.gamificationRule.findUnique({ where: { code: 'XP_ATTENDANCE' } });
        const xpValue = rule && rule.isActive ? rule.xpValue : 20;

        if (xpValue > 0) {
          await tx.pointTransaction.create({
            data: {
              studentId,
              amount: xpValue,
              type: 'ATTENDANCE',
              description: `XP por presença confirmada em aula`,
              originReference: lessonId,
            },
          });

          await tx.coinTransaction.create({
            data: {
              studentId,
              amount: xpValue,
              type: 'EARNED',
              description: `Coins por presença confirmada em aula`,
              originReference: lessonId,
            },
          });

          const student = await tx.student.update({
            where: { id: studentId },
            data: {
              currentXp: { increment: xpValue },
              coinBalance: { increment: xpValue },
            },
          });

          const newLevel = Math.floor(student.currentXp / 300) + 1;
          if (newLevel !== student.level) {
            await tx.student.update({
              where: { id: studentId },
              data: { level: newLevel },
            });
          }
        }
      }
    }

    return updatedAttendance;
  });
}

// ==========================================
// 15. REGRAS DE GAMIFICAÇÃO (FASE 15)
// ==========================================

export async function updateGamificationRuleByDirector(ruleCode: string, xpValue: number) {
  const updated = await prisma.gamificationRule.update({
    where: { code: ruleCode },
    data: {
      xpValue,
    },
  });

  return {
    id: updated.id,
    code: updated.code,
    name: updated.name,
    xpValue: updated.xpValue,
    description: updated.description,
    isActive: updated.isActive,
  };
}

// ==========================================
// 16. DIÁRIO DE AULA & MATERIAIS DE APOIO (MARCO 7)
// ==========================================

export interface SupportMaterialItem {
  id: string;
  title: string;
  url: string;
  description?: string;
}

export interface LessonDiaryData {
  id: string;
  classId: string;
  className: string;
  classCode: string;
  teacherId: string | null;
  teacherName: string;
  lessonNumber: number;
  title: string;
  date: string;
  scheduleTime: string;
  status: string;
  plannedTopics: string[];
  taughtTopics: string[];
  materials: SupportMaterialItem[];
}

export function parseTopicsList(raw: string | null | undefined): string[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed || trimmed === 'Nenhum tópico planejado registrado.') return [];

  if (trimmed.includes('\n')) {
    return trimmed
      .split('\n')
      .map((line) => line.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim())
      .filter((line) => line.length > 0);
  }

  if (trimmed.includes(',')) {
    return trimmed
      .split(',')
      .map((part) => part.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '').trim())
      .filter((p) => p.length > 0);
  }

  return [trimmed.replace(/^(\d+[\.\)]\s*|[-•*]\s*)/, '')];
}

export function parseMaterialsList(raw: string | null | undefined): SupportMaterialItem[] {
  if (!raw || typeof raw !== 'string') return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item.title === 'string' && typeof item.url === 'string')
        .map((item) => ({
          id: item.id || `mat_${randomUUID()}`,
          title: String(item.title).trim(),
          url: String(item.url).trim(),
          description: item.description ? String(item.description).trim() : undefined,
        }));
    }
  } catch {
    // Texto legado não JSON - não gerar link falso
  }
  return [];
}

export function extractPlannedTopics(lesson: {
  plannedContent?: string | null;
  contents?: Array<{ contentType: string; title: string; description?: string | null; orderIndex: number }>;
}): string[] {
  if (lesson.contents && Array.isArray(lesson.contents)) {
    const planned = lesson.contents
      .filter((c) => c.contentType === 'PLANNED')
      .sort((a, b) => a.orderIndex - b.orderIndex);
    if (planned.length > 0) {
      if (planned.length === 1 && planned[0].title.startsWith('Conteúdo Programático:')) {
        return parseTopicsList(planned[0].description || lesson.plannedContent);
      }
      return planned.map((c) => c.title.trim()).filter((t) => t.length > 0);
    }
  }
  return parseTopicsList(lesson.plannedContent);
}

export function extractTaughtTopics(lesson: {
  actualContent?: string | null;
  contents?: Array<{ contentType: string; title: string; description?: string | null; orderIndex: number }>;
}): string[] {
  if (lesson.contents && Array.isArray(lesson.contents)) {
    const taught = lesson.contents
      .filter((c) => c.contentType === 'TAUGHT')
      .sort((a, b) => a.orderIndex - b.orderIndex);
    if (taught.length > 0) {
      if (taught.length === 1 && taught[0].title.startsWith('Conteúdo Ministrado em Sala:')) {
        return parseTopicsList(taught[0].description || lesson.actualContent);
      }
      return taught.map((c) => c.title.trim()).filter((t) => t.length > 0);
    }
  }
  return lesson.actualContent ? parseTopicsList(lesson.actualContent) : [];
}

export async function getLessonWithDiary(
  lessonId: string,
  sessionUser: { id: string; role: string; studentId?: string; teacherId?: string; directorId?: string }
): Promise<LessonDiaryData> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      class: {
        include: {
          teacher: { include: { user: true } },
          enrollments: true,
        },
      },
      teacher: { include: { user: true } },
      contents: {
        orderBy: { orderIndex: 'asc' },
      },
    },
  });

  if (!lesson) {
    const err = new Error('Aula não encontrada.');
    (err as any).statusCode = 404;
    throw err;
  }

  // Permissões de Leitura
  if (sessionUser.role === 'ALUNO') {
    let studentId = sessionUser.studentId;
    if (!studentId) {
      const st = await prisma.student.findUnique({ where: { userId: sessionUser.id } });
      studentId = st?.id;
    }
    const isEnrolled = lesson.class.enrollments.some(
      (e) => e.studentId === studentId && e.status === 'ACTIVE'
    );
    if (!isEnrolled) {
      const err = new Error('Acesso negado: aluno não possui matrícula ativa nesta turma.');
      (err as any).statusCode = 403;
      throw err;
    }
  }

  const plannedTopics = extractPlannedTopics(lesson);
  const taughtTopics = extractTaughtTopics(lesson);
  const materials = parseMaterialsList(lesson.materials);

  const teacherName = lesson.teacher?.user?.name || lesson.class.teacher?.user?.name || 'Professor Fuctura';

  return {
    id: lesson.id,
    classId: lesson.classId,
    className: lesson.class.name,
    classCode: lesson.class.code,
    teacherId: lesson.teacherId || lesson.class.teacherId,
    teacherName,
    lessonNumber: lesson.lessonNumber,
    title: lesson.title,
    date: lesson.date.toISOString(),
    scheduleTime: lesson.scheduleTime,
    status: lesson.status,
    plannedTopics,
    taughtTopics,
    materials,
  };
}

export async function updateLessonDiary(
  lessonId: string,
  data: {
    plannedTopics?: string[];
    taughtTopics?: string[];
    materials?: SupportMaterialItem[];
  },
  sessionUser: { id: string; role: string; studentId?: string; teacherId?: string; directorId?: string }
): Promise<LessonDiaryData> {
  const lesson = await prisma.lesson.findUnique({
    where: { id: lessonId },
    include: {
      class: true,
      teacher: true,
    },
  });

  if (!lesson) {
    const err = new Error('Aula não encontrada.');
    (err as any).statusCode = 404;
    throw err;
  }

  // Permissões de Escrita
  if (sessionUser.role === 'ALUNO') {
    const err = new Error('Acesso negado: alunos não possuem permissão para editar o diário de aula.');
    (err as any).statusCode = 403;
    throw err;
  }

  if (sessionUser.role === 'PROFESSOR') {
    let teacherId = sessionUser.teacherId;
    if (!teacherId) {
      const t = await prisma.teacher.findUnique({ where: { userId: sessionUser.id } });
      teacherId = t?.id;
    }

    const isClassTeacher = lesson.class.teacherId === teacherId;
    const isLessonTeacher = lesson.teacherId === teacherId;
    if (!isClassTeacher && !isLessonTeacher) {
      const err = new Error('Acesso negado: professor não é o responsável por esta turma/aula.');
      (err as any).statusCode = 403;
      throw err;
    }
  }

  // Validação dos materiais
  if (data.materials !== undefined) {
    for (const mat of data.materials) {
      if (!mat.title || !mat.title.trim()) {
        const err = new Error('O título do material de apoio é obrigatório.');
        (err as any).statusCode = 400;
        throw err;
      }
      if (!mat.url || !mat.url.trim()) {
        const err = new Error('A URL do material de apoio é obrigatória.');
        (err as any).statusCode = 400;
        throw err;
      }
      const trimmedUrl = mat.url.trim();
      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        const err = new Error(`A URL "${trimmedUrl}" deve iniciar com http:// ou https://`);
        (err as any).statusCode = 400;
        throw err;
      }
      try {
        new URL(trimmedUrl);
      } catch {
        const err = new Error(`A URL "${trimmedUrl}" é inválida.`);
        (err as any).statusCode = 400;
        throw err;
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    // 1. Atualizar Tópicos Planejados (se fornecidos)
    if (data.plannedTopics !== undefined) {
      const sanitizedPlanned = data.plannedTopics
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await tx.lessonContent.deleteMany({
        where: {
          lessonId,
          contentType: 'PLANNED',
        },
      });

      for (let i = 0; i < sanitizedPlanned.length; i++) {
        await tx.lessonContent.create({
          data: {
            lessonId,
            title: sanitizedPlanned[i],
            contentType: 'PLANNED',
            orderIndex: i + 1,
          },
        });
      }

      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          plannedContent:
            sanitizedPlanned.length > 0
              ? sanitizedPlanned.map((t, idx) => `${idx + 1}. ${t}`).join('\n')
              : 'Nenhum tópico planejado registrado.',
        },
      });
    }

    // 2. Atualizar Tópicos Ministrados (se fornecidos)
    if (data.taughtTopics !== undefined) {
      const sanitizedTaught = data.taughtTopics
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      await tx.lessonContent.deleteMany({
        where: {
          lessonId,
          contentType: 'TAUGHT',
        },
      });

      for (let i = 0; i < sanitizedTaught.length; i++) {
        await tx.lessonContent.create({
          data: {
            lessonId,
            title: sanitizedTaught[i],
            contentType: 'TAUGHT',
            orderIndex: i + 1,
          },
        });
      }

      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          actualContent:
            sanitizedTaught.length > 0
              ? sanitizedTaught.map((t, idx) => `${idx + 1}. ${t}`).join('\n')
              : null,
        },
      });
    }

    // 3. Atualizar Materiais de Apoio (se fornecidos)
    if (data.materials !== undefined) {
      const sanitizedMaterials: SupportMaterialItem[] = data.materials.map((m) => ({
        id: m.id || `mat_${randomUUID()}`,
        title: m.title.trim(),
        url: m.url.trim(),
        description: m.description && m.description.trim() ? m.description.trim() : undefined,
      }));

      await tx.lesson.update({
        where: { id: lessonId },
        data: {
          materials: sanitizedMaterials.length > 0 ? JSON.stringify(sanitizedMaterials) : null,
        },
      });

      await tx.lessonContent.deleteMany({
        where: {
          lessonId,
          contentType: 'COMPLEMENTARY',
        },
      });

      for (let i = 0; i < sanitizedMaterials.length; i++) {
        const mat = sanitizedMaterials[i];
        await tx.lessonContent.create({
          data: {
            lessonId,
            title: mat.title,
            description: JSON.stringify({ url: mat.url, description: mat.description }),
            contentType: 'COMPLEMENTARY',
            orderIndex: i + 1,
          },
        });
      }
    }
  });

  return getLessonWithDiary(lessonId, sessionUser);
}

export async function getClassLessonsWithDiary(
  classId: string,
  sessionUser: { id: string; role: string; studentId?: string; teacherId?: string; directorId?: string }
): Promise<LessonDiaryData[]> {
  const cls = await prisma.class.findUnique({
    where: { id: classId },
    include: {
      enrollments: true,
      teacher: { include: { user: true } },
      lessons: {
        include: {
          contents: { orderBy: { orderIndex: 'asc' } },
          teacher: { include: { user: true } },
        },
        orderBy: { lessonNumber: 'asc' },
      },
    },
  });

  if (!cls) {
    const err = new Error('Turma não encontrada.');
    (err as any).statusCode = 404;
    throw err;
  }

  // Permissões
  if (sessionUser.role === 'ALUNO') {
    let studentId = sessionUser.studentId;
    if (!studentId) {
      const st = await prisma.student.findUnique({ where: { userId: sessionUser.id } });
      studentId = st?.id;
    }
    const isEnrolled = cls.enrollments.some(
      (e) => e.studentId === studentId && e.status === 'ACTIVE'
    );
    if (!isEnrolled) {
      const err = new Error('Acesso negado: aluno não possui matrícula ativa nesta turma.');
      (err as any).statusCode = 403;
      throw err;
    }
  }

  return cls.lessons.map((l) => ({
    id: l.id,
    classId: cls.id,
    className: cls.name,
    classCode: cls.code,
    teacherId: l.teacherId || cls.teacherId,
    teacherName: l.teacher?.user?.name || cls.teacher?.user?.name || 'Professor Fuctura',
    lessonNumber: l.lessonNumber,
    title: l.title,
    date: l.date.toISOString(),
    scheduleTime: l.scheduleTime,
    status: l.status,
    plannedTopics: extractPlannedTopics(l),
    taughtTopics: extractTaughtTopics(l),
    materials: parseMaterialsList(l.materials),
  }));
}
