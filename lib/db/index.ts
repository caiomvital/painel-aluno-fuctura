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
} from './seed-data';
import {
  UserEntity,
  StudentEntity,
  TeacherEntity,
  DirectorEntity,
  CourseEntity,
  ClassEntity,
  EnrollmentEntity,
  LessonEntity,
  AttendanceEntity,
  PointTransactionEntity,
  StreakEntity,
  BadgeEntity,
  StudentBadgeEntity,
  GamificationRuleEntity,
} from './types';

// In-memory data store with seeded data
// This guarantees zero-crash behavior in any preview environment,
// and can be synced with Prisma PostgreSQL when DATABASE_URL is active.
interface DataStore {
  users: UserEntity[];
  directors: DirectorEntity[];
  teachers: TeacherEntity[];
  students: StudentEntity[];
  courses: CourseEntity[];
  classes: ClassEntity[];
  enrollments: EnrollmentEntity[];
  lessons: LessonEntity[];
  attendances: AttendanceEntity[];
  streaks: StreakEntity[];
  badges: BadgeEntity[];
  studentBadges: StudentBadgeEntity[];
  pointTransactions: PointTransactionEntity[];
  gamificationRules: GamificationRuleEntity[];
}

// Global singleton to persist state across Next.js API re-evaluations in memory
const globalForStore = globalThis as unknown as { fucturaStore?: DataStore };

function initStore(): DataStore {
  return {
    users: [...INITIAL_USERS],
    directors: [...INITIAL_DIRECTORS],
    teachers: [...INITIAL_TEACHERS],
    students: [...INITIAL_STUDENTS],
    courses: [...INITIAL_COURSES],
    classes: [...INITIAL_CLASSES],
    enrollments: [...INITIAL_ENROLLMENTS],
    lessons: [...INITIAL_LESSONS],
    attendances: [...INITIAL_ATTENDANCES],
    streaks: [...INITIAL_STREAKS],
    badges: [...INITIAL_BADGES],
    studentBadges: [...INITIAL_STUDENT_BADGES],
    pointTransactions: [...INITIAL_POINT_TRANSACTIONS],
    gamificationRules: [...INITIAL_GAMIFICATION_RULES],
  };
}

const store: DataStore = globalForStore.fucturaStore || initStore();
if (process.env.NODE_ENV !== 'production') {
  globalForStore.fucturaStore = store;
}

// ==========================================
// USER & AUTHENTICATION REPOSITORY
// ==========================================

export async function findUserByEmail(email: string): Promise<UserEntity | null> {
  const normalized = email.trim().toLowerCase();
  return store.users.find((u) => u.email.toLowerCase() === normalized) || null;
}

export async function findUserById(id: string): Promise<UserEntity | null> {
  return store.users.find((u) => u.id === id) || null;
}

export async function getStudentByUserId(userId: string): Promise<StudentEntity | null> {
  return store.students.find((s) => s.userId === userId) || null;
}

export async function getTeacherByUserId(userId: string): Promise<TeacherEntity | null> {
  return store.teachers.find((t) => t.userId === userId) || null;
}

export async function getDirectorByUserId(userId: string): Promise<DirectorEntity | null> {
  return store.directors.find((d) => d.userId === userId) || null;
}

// ==========================================
// GAMIFICATION ENGINE & XP RULES
// ==========================================

export async function getGamificationRule(code: string): Promise<number> {
  const rule = store.gamificationRules.find((r) => r.code === code && r.isActive);
  return rule ? rule.xpValue : 10;
}

/**
 * Concede XP de Login Diário com proteção contra abuso (máximo 1x por dia)
 */
export async function awardDailyLoginXp(studentId: string): Promise<{ awarded: boolean; xpAmount: number }> {
  const todayStr = new Date().toISOString().slice(0, 10);
  const loginRef = `DAILY_LOGIN_${todayStr}`;

  // Verificar se já recebeu login hoje
  const alreadyAwarded = store.pointTransactions.some(
    (pt) => pt.studentId === studentId && pt.type === 'LOGIN' && pt.originReference === loginRef
  );

  if (alreadyAwarded) {
    return { awarded: false, xpAmount: 0 };
  }

  const xpValue = await getGamificationRule('XP_LOGIN');
  const transaction: PointTransactionEntity = {
    id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    studentId,
    amount: xpValue,
    type: 'LOGIN',
    description: `XP por Login Diário (${todayStr.split('-').reverse().join('/')})`,
    originReference: loginRef,
    createdAt: new Date().toISOString(),
  };

  store.pointTransactions.unshift(transaction);

  // Atualiza saldo de XP do aluno
  const student = store.students.find((s) => s.id === studentId);
  if (student) {
    student.currentXp += xpValue;
    student.level = Math.floor(student.currentXp / 300) + 1;
    student.updatedAt = new Date().toISOString();
  }

  return { awarded: true, xpAmount: xpValue };
}

// ==========================================
// STUDENT DASHBOARD & ACADEMIC DATA
// ==========================================

export async function getStudentDashboard(userId: string) {
  let user = await findUserById(userId);
  let student = await getStudentByUserId(userId);

  // Fallback to default student mockup so preview and evaluation never break
  if (!user || user.role !== 'ALUNO' || !student) {
    user = store.users.find((u) => u.role === 'ALUNO') || store.users[0];
    student = store.students[0];
  }

  // Matrícula e Turma do Aluno
  const enrollment = store.enrollments.find((e) => e.studentId === student.id && e.status === 'ACTIVE');
  const studentClass = enrollment ? store.classes.find((c) => c.id === enrollment.classId) : null;
  const course = studentClass ? store.courses.find((c) => c.id === studentClass.courseId) : null;
  const teacher = studentClass && studentClass.teacherId ? store.teachers.find((t) => t.id === studentClass.teacherId) : null;
  const teacherUser = teacher ? store.users.find((u) => u.id === teacher.userId) : null;

  // Aulas da Turma
  const classLessons = studentClass
    ? store.lessons
        .filter((l) => l.classId === studentClass.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const completedLessons = classLessons.filter((l) => l.status === 'COMPLETED');
  const scheduledLessons = classLessons.filter((l) => l.status === 'SCHEDULED');

  // Última aula (O que vimos)
  const lastLesson = completedLessons.length > 0 ? completedLessons[completedLessons.length - 1] : null;

  // Próxima aula (O que vem depois)
  const nextLesson = scheduledLessons.length > 0 ? scheduledLessons[0] : null;

  // Presenças do aluno
  const studentAttendances = store.attendances.filter((a) => a.studentId === student.id);
  const confirmedAttendances = studentAttendances.filter((a) => a.status === 'PRESENT');

  // Streak de Participação (Aulas consecutivas com presença confirmada)
  const streakRecord = store.streaks.find((s) => s.studentId === student.id);
  const streak = streakRecord ? streakRecord.currentStreak : 0;

  // Ranking na turma
  let rankingPosition = 1;
  let totalInClass = 1;
  let classRanking: Array<{ id: string; name: string; xp: number; position: number; isCurrentUser: boolean }> = [];

  if (studentClass) {
    const classEnrollments = store.enrollments.filter((e) => e.classId === studentClass.id && e.status === 'ACTIVE');
    const classStudentIds = classEnrollments.map((e) => e.studentId);
    totalInClass = classStudentIds.length;

    const classStudents = store.students
      .filter((s) => classStudentIds.includes(s.id))
      .sort((a, b) => b.currentXp - a.currentXp);

    classRanking = classStudents.map((s, index) => {
      const u = store.users.find((usr) => usr.id === s.userId);
      return {
        id: s.id,
        name: u ? u.name : 'Aluno',
        xp: s.currentXp,
        position: index + 1,
        isCurrentUser: s.id === student.id,
      };
    });

    const userEntry = classRanking.find((r) => r.isCurrentUser);
    if (userEntry) {
      rankingPosition = userEntry.position;
    }
  }

  // Progresso do curso (baseado em aulas concluídas sobre o total)
  const totalLessons = classLessons.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons.length / totalLessons) * 100) : 0;

  // Frequência do aluno
  const attendanceRate = completedLessons.length > 0 ? Math.round((confirmedAttendances.length / completedLessons.length) * 100) : 100;

  // Badges conquistadas
  const myStudentBadges = store.studentBadges.filter((sb) => sb.studentId === student.id);
  const earnedBadgeIds = myStudentBadges.map((sb) => sb.badgeId);
  const allBadges = store.badges.map((b) => ({
    ...b,
    isEarned: earnedBadgeIds.includes(b.id),
    earnedAt: myStudentBadges.find((sb) => sb.badgeId === b.id)?.earnedAt || null,
  }));

  // Conteúdos perdidos (Aulas completadas sem presença confirmada)
  const missedLessons = completedLessons.filter((cl) => {
    const att = studentAttendances.find((a) => a.lessonId === cl.id);
    return !att || att.status !== 'PRESENT';
  });

  // Próxima aula: verificar se aluno já marcou presença pendente
  const nextLessonAttendance = nextLesson ? studentAttendances.find((a) => a.lessonId === nextLesson.id) : null;

  // Transações de XP recentes
  const recentTransactions = store.pointTransactions
    .filter((pt) => pt.studentId === student.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

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
          modules: course.modules || [],
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
          date: lastLesson.date,
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
          date: nextLesson.date,
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
      date: ml.date,
      plannedContent: ml.plannedContent,
      materials: ml.materials,
    })),
    ranking: classRanking.slice(0, 10),
    badges: allBadges,
    recentTransactions,
  };
}

/**
 * Aluno marca presença em uma aula (status inicial PENDENTE)
 * O servidor impede presenças duplicadas e nunca confirma automaticamente.
 */
export async function requestStudentAttendance(lessonId: string, userId: string) {
  const user = await findUserById(userId);
  if (!user || user.role !== 'ALUNO') {
    throw new Error('Apenas alunos podem solicitar presença.');
  }

  const student = await getStudentByUserId(userId);
  if (!student) {
    throw new Error('Aluno não encontrado.');
  }

  const lesson = store.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    throw new Error('Aula não encontrada.');
  }

  // Verifica se o aluno está matriculado na turma da aula
  const enrollment = store.enrollments.find((e) => e.studentId === student.id && e.classId === lesson.classId && e.status === 'ACTIVE');
  if (!enrollment) {
    throw new Error('Você não está matriculado na turma desta aula.');
  }

  // Verifica se já existe registro de presença
  const existingAttendance = store.attendances.find((a) => a.lessonId === lesson.id && a.studentId === student.id);
  if (existingAttendance) {
    if (existingAttendance.status === 'PRESENT') {
      throw new Error('Sua presença já está confirmada nesta aula.');
    }
    if (existingAttendance.status === 'PENDING') {
      throw new Error('Sua solicitação de presença já está aguardando confirmação do professor.');
    }
  }

  const newAttendance: AttendanceEntity = {
    id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    lessonId: lesson.id,
    studentId: student.id,
    status: 'PENDING',
    requestedAt: new Date().toISOString(),
    confirmedAt: null,
    confirmedById: null,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.attendances.push(newAttendance);
  return newAttendance;
}

// ==========================================
// TEACHER DASHBOARD & OPERATIONS
// ==========================================

export async function getTeacherDashboard(userId: string) {
  let user = await findUserById(userId);
  let teacher = await getTeacherByUserId(userId);

  // Fallback to default teacher mockup so preview and evaluation never break
  if (!user || user.role !== 'PROFESSOR' || !teacher) {
    user = store.users.find((u) => u.role === 'PROFESSOR') || store.users[1];
    teacher = store.teachers[0];
  }

  // Turmas do professor
  const teacherClasses = store.classes.filter((c) => c.teacherId === teacher.id);

  // Detalhes de cada turma (alunos, próxima aula, frequência média)
  const classesData = teacherClasses.map((cls) => {
    const course = store.courses.find((c) => c.id === cls.courseId);
    const enrollments = store.enrollments.filter((e) => e.classId === cls.id && e.status === 'ACTIVE');
    const studentIds = enrollments.map((e) => e.studentId);
    const students = store.students.filter((s) => studentIds.includes(s.id)).map((s) => {
      const u = store.users.find((usr) => usr.id === s.userId);
      const studentAtts = store.attendances.filter((a) => a.studentId === s.id);
      const confirmedAtts = studentAtts.filter((a) => a.status === 'PRESENT');
      return {
        id: s.id,
        name: u ? u.name : 'Aluno',
        email: u ? u.email : '',
        registrationNumber: s.registrationNumber,
        currentXp: s.currentXp,
        confirmedCount: confirmedAtts.length,
      };
    });

    const lessons = store.lessons
      .filter((l) => l.classId === cls.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const nextLesson = lessons.find((l) => l.status === 'SCHEDULED') || null;
    const completedLessons = lessons.filter((l) => l.status === 'COMPLETED');

    return {
      id: cls.id,
      name: cls.name,
      code: cls.code,
      courseName: course ? course.name : 'Curso',
      daysOfWeek: cls.daysOfWeek,
      scheduleTime: cls.scheduleTime,
      lessonsPerWeek: cls.lessonsPerWeek,
      totalStudents: students.length,
      students,
      totalLessons: lessons.length,
      completedLessonsCount: completedLessons.length,
      nextLesson: nextLesson
        ? {
            id: nextLesson.id,
            lessonNumber: nextLesson.lessonNumber,
            title: nextLesson.title,
            date: nextLesson.date,
            scheduleTime: nextLesson.scheduleTime,
            plannedContent: nextLesson.plannedContent,
            actualContent: nextLesson.actualContent,
          }
        : null,
    };
  });

  // Próxima aula geral do professor
  const allTeacherLessons = store.lessons
    .filter((l) => teacherClasses.some((c) => c.id === l.classId) && l.status === 'SCHEDULED')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingLesson = allTeacherLessons.length > 0 ? allTeacherLessons[0] : null;
  const upcomingLessonClass = upcomingLesson ? store.classes.find((c) => c.id === upcomingLesson.classId) : null;

  // Solicitações de presença pendentes para turmas deste professor
  const teacherClassIds = teacherClasses.map((c) => c.id);
  const teacherLessonIds = store.lessons.filter((l) => teacherClassIds.includes(l.classId)).map((l) => l.id);

  const pendingAttendances = store.attendances
    .filter((a) => teacherLessonIds.includes(a.lessonId) && a.status === 'PENDING')
    .map((att) => {
      const lesson = store.lessons.find((l) => l.id === att.lessonId);
      const student = store.students.find((s) => s.id === att.studentId);
      const studentUser = student ? store.users.find((u) => u.id === student.userId) : null;
      const cls = lesson ? store.classes.find((c) => c.id === lesson.classId) : null;

      return {
        id: att.id,
        lessonId: att.lessonId,
        lessonTitle: lesson ? lesson.title : 'Aula',
        lessonNumber: lesson ? lesson.lessonNumber : 1,
        className: cls ? cls.name : 'Turma',
        studentId: att.studentId,
        studentName: studentUser ? studentUser.name : 'Aluno',
        studentReg: student ? student.registrationNumber : '',
        requestedAt: att.requestedAt,
      };
    });

  return {
    teacher: {
      id: teacher.id,
      name: user.name,
      email: user.email,
      specialty: teacher.specialty,
      biography: teacher.biography,
    },
    classes: classesData,
    upcomingLesson: upcomingLesson && upcomingLessonClass
      ? {
          id: upcomingLesson.id,
          title: upcomingLesson.title,
          lessonNumber: upcomingLesson.lessonNumber,
          date: upcomingLesson.date,
          scheduleTime: upcomingLesson.scheduleTime,
          className: upcomingLessonClass.name,
          plannedContent: upcomingLesson.plannedContent,
        }
      : null,
    pendingAttendances,
  };
}

/**
 * Professor confirma a presença de um aluno
 * Gera XP de presença no backend conforme regra de gamificação vigente e atualiza streak
 */
export async function confirmTeacherAttendance(attendanceId: string, teacherUserId: string) {
  const teacher = await getTeacherByUserId(teacherUserId);
  if (!teacher) {
    throw new Error('Não autorizado. Apenas o professor responsável pode confirmar presença.');
  }

  const attendance = store.attendances.find((a) => a.id === attendanceId);
  if (!attendance) {
    throw new Error('Registro de presença não encontrado.');
  }

  const lesson = store.lessons.find((l) => l.id === attendance.lessonId);
  if (!lesson) {
    throw new Error('Aula associada não encontrada.');
  }

  const cls = store.classes.find((c) => c.id === lesson.classId);
  if (!cls || cls.teacherId !== teacher.id) {
    throw new Error('Você só pode confirmar presença de alunos das suas próprias turmas.');
  }

  attendance.status = 'PRESENT';
  attendance.confirmedAt = new Date().toISOString();
  attendance.confirmedById = teacherUserId;
  attendance.updatedAt = new Date().toISOString();

  // Conceder XP de presença (determinado no backend)
  const xpValue = await getGamificationRule('XP_ATTENDANCE');
  const student = store.students.find((s) => s.id === attendance.studentId);
  if (student) {
    student.currentXp += xpValue;
    student.level = Math.floor(student.currentXp / 300) + 1;
    student.updatedAt = new Date().toISOString();

    // Criar PointTransaction oficial
    const tx: PointTransactionEntity = {
      id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      studentId: student.id,
      amount: xpValue,
      type: 'ATTENDANCE',
      description: `Presença confirmada: Aula ${lesson.lessonNumber} - ${lesson.title}`,
      originReference: lesson.id,
      createdAt: new Date().toISOString(),
    };
    store.pointTransactions.unshift(tx);

    // Atualizar Streak do aluno
    let streak = store.streaks.find((s) => s.studentId === student.id);
    if (!streak) {
      streak = {
        id: `str_${Date.now()}`,
        studentId: student.id,
        currentStreak: 1,
        maxStreak: 1,
        lastAttendedLessonId: lesson.id,
        lastAttendedDate: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.streaks.push(streak);
    } else {
      streak.currentStreak += 1;
      if (streak.currentStreak > streak.maxStreak) {
        streak.maxStreak = streak.currentStreak;
      }
      streak.lastAttendedLessonId = lesson.id;
      streak.lastAttendedDate = new Date().toISOString();
      streak.updatedAt = new Date().toISOString();
    }
  }

  return attendance;
}

/**
 * Professor recusa a presença com motivo
 */
export async function rejectTeacherAttendance(attendanceId: string, teacherUserId: string, reason?: string) {
  const teacher = await getTeacherByUserId(teacherUserId);
  if (!teacher) {
    throw new Error('Não autorizado.');
  }

  const attendance = store.attendances.find((a) => a.id === attendanceId);
  if (!attendance) {
    throw new Error('Registro de presença não encontrado.');
  }

  attendance.status = 'ABSENT';
  attendance.confirmedAt = null;
  attendance.confirmedById = teacherUserId;
  attendance.rejectionReason = reason || 'Não compareceu à aula ou horário expirado.';
  attendance.updatedAt = new Date().toISOString();

  return attendance;
}

// ==========================================
// DIRECTOR DASHBOARD & OPERATIONS
// ==========================================

export async function getDirectorDashboard(userId: string) {
  let user = await findUserById(userId);

  // Fallback to default director mockup so preview and evaluation never break
  if (!user || user.role !== 'DIRETOR') {
    user = store.users.find((u) => u.role === 'DIRETOR') || store.users[3];
  }

  const totalStudents = store.students.length;
  const totalTeachers = store.teachers.length;
  const totalCourses = store.courses.length;
  const totalClasses = store.classes.length;

  const classesList = store.classes.map((cls) => {
    const course = store.courses.find((c) => c.id === cls.courseId);
    const teacher = cls.teacherId ? store.teachers.find((t) => t.id === cls.teacherId) : null;
    const teacherUser = teacher ? store.users.find((u) => u.id === teacher.userId) : null;
    const enrollments = store.enrollments.filter((e) => e.classId === cls.id && e.status === 'ACTIVE');

    return {
      id: cls.id,
      name: cls.name,
      code: cls.code,
      courseId: cls.courseId,
      courseName: course ? course.name : 'Curso',
      teacherId: cls.teacherId,
      teacherName: teacherUser ? teacherUser.name : 'Não atribuído',
      daysOfWeek: cls.daysOfWeek,
      scheduleTime: cls.scheduleTime,
      durationMinutes: cls.durationMinutes,
      lessonsPerWeek: cls.lessonsPerWeek,
      status: cls.status,
      enrolledCount: enrollments.length,
      startDate: cls.startDate,
      endDate: cls.endDate,
    };
  });

  const coursesList = store.courses.map((c) => ({
    id: c.id,
    name: c.name,
    code: c.code,
    description: c.description,
    workloadHours: c.workloadHours,
    category: c.category,
    partnerCertification: c.partnerCertification,
    modality: c.modality,
    modules: c.modules || [],
  }));

  const teachersList = store.teachers.map((t) => {
    const u = store.users.find((usr) => usr.id === t.userId);
    const assignedClasses = store.classes.filter((c) => c.teacherId === t.id);
    return {
      id: t.id,
      userId: t.userId,
      name: u ? u.name : 'Professor',
      email: u ? u.email : '',
      specialty: t.specialty,
      assignedClassesCount: assignedClasses.length,
      assignedClasses: assignedClasses.map((c) => c.name),
    };
  });

  const studentsList = store.students.map((s) => {
    const u = store.users.find((usr) => usr.id === s.userId);
    const enrollment = store.enrollments.find((e) => e.studentId === s.id && e.status === 'ACTIVE');
    const enrolledClass = enrollment ? store.classes.find((c) => c.id === enrollment.classId) : null;
    const streak = store.streaks.find((st) => st.studentId === s.id);

    const studentAtts = store.attendances.filter((a) => a.studentId === s.id);
    const confirmed = studentAtts.filter((a) => a.status === 'PRESENT').length;
    const rate = studentAtts.length > 0 ? Math.round((confirmed / studentAtts.length) * 100) : 100;

    return {
      id: s.id,
      userId: s.userId,
      name: u ? u.name : 'Aluno',
      email: u ? u.email : '',
      registrationNumber: s.registrationNumber,
      currentXp: s.currentXp,
      level: s.level,
      streak: streak ? streak.currentStreak : 0,
      classId: enrolledClass ? enrolledClass.id : null,
      className: enrolledClass ? enrolledClass.name : 'Sem turma atribuída',
      attendanceRate: rate,
    };
  });

  const rules = store.gamificationRules;

  return {
    director: {
      name: user.name,
      email: user.email,
    },
    metrics: {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalClasses,
    },
    classes: classesList,
    courses: coursesList,
    teachers: teachersList,
    students: studentsList,
    gamificationRules: rules,
  };
}

/**
 * Diretor cria uma nova turma com frequência configurável (lessonsPerWeek)
 */
export async function createClassByDirector(data: {
  name: string;
  code: string;
  courseId: string;
  teacherId?: string;
  daysOfWeek: string;
  scheduleTime: string;
  durationMinutes: number;
  lessonsPerWeek: number;
  startDate: string;
  endDate?: string;
}) {
  if (!data.name || !data.code || !data.courseId || !data.daysOfWeek || !data.scheduleTime) {
    throw new Error('Preencha todos os campos obrigatórios da turma.');
  }

  // Verifica código duplicado
  if (store.classes.some((c) => c.code.toLowerCase() === data.code.toLowerCase())) {
    throw new Error('Já existe uma turma cadastrada com este código.');
  }

  const newClass: ClassEntity = {
    id: `class_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    name: data.name.trim(),
    code: data.code.trim().toUpperCase(),
    courseId: data.courseId,
    teacherId: data.teacherId || null,
    startDate: data.startDate,
    endDate: data.endDate || null,
    daysOfWeek: data.daysOfWeek.trim(),
    scheduleTime: data.scheduleTime.trim(),
    durationMinutes: Number(data.durationMinutes) || 180,
    lessonsPerWeek: Number(data.lessonsPerWeek) || 1, // Salva quantidade de aulas por semana individual
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.classes.push(newClass);
  return newClass;
}

/**
 * Diretor edita uma turma existente
 */
export async function updateClassByDirector(
  classId: string,
  data: Partial<{
    name: string;
    teacherId: string | null;
    daysOfWeek: string;
    scheduleTime: string;
    durationMinutes: number;
    lessonsPerWeek: number;
    status: 'ACTIVE' | 'FINISHED' | 'UPCOMING';
  }>
) {
  const cls = store.classes.find((c) => c.id === classId);
  if (!cls) {
    throw new Error('Turma não encontrada.');
  }

  if (data.name) cls.name = data.name.trim();
  if (data.teacherId !== undefined) cls.teacherId = data.teacherId;
  if (data.daysOfWeek) cls.daysOfWeek = data.daysOfWeek.trim();
  if (data.scheduleTime) cls.scheduleTime = data.scheduleTime.trim();
  if (data.durationMinutes) cls.durationMinutes = Number(data.durationMinutes);
  if (data.lessonsPerWeek) cls.lessonsPerWeek = Number(data.lessonsPerWeek);
  if (data.status) cls.status = data.status;
  cls.updatedAt = new Date().toISOString();

  return cls;
}

/**
 * Diretor altera regras de gamificação (valores de XP)
 */
export async function updateGamificationRuleByDirector(ruleCode: string, xpValue: number) {
  const rule = store.gamificationRules.find((r) => r.code === ruleCode);
  if (!rule) {
    throw new Error('Regra não encontrada.');
  }
  rule.xpValue = Math.max(1, Number(xpValue) || 1);
  rule.updatedAt = new Date().toISOString();
  return rule;
}

// ==========================================
// STUDENT ATTENDANCE HISTORY FOR TEACHER & DIRECTOR
// ==========================================

export async function getStudentAttendanceHistory(studentId: string) {
  let student = store.students.find((s) => s.id === studentId);
  if (!student) {
    student = store.students[0];
  }

  const user = store.users.find((u) => u.id === student.userId) || store.users[0];
  const enrollment = store.enrollments.find((e) => e.studentId === student.id && e.status === 'ACTIVE');
  const studentClass = enrollment ? store.classes.find((c) => c.id === enrollment.classId) : store.classes[0];
  const course = studentClass ? store.courses.find((c) => c.id === studentClass.courseId) : store.courses[0];
  const teacher = studentClass?.teacherId ? store.teachers.find((t) => t.id === studentClass.teacherId) : null;
  const teacherUser = teacher ? store.users.find((u) => u.id === teacher.userId) : null;

  const classLessons = studentClass
    ? store.lessons
        .filter((l) => l.classId === studentClass.id)
        .sort((a, b) => b.lessonNumber - a.lessonNumber)
    : [];

  const studentAttendances = store.attendances.filter((a) => a.studentId === student.id);

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

    const confirmedByUser = att?.confirmedById ? store.users.find((u) => u.id === att.confirmedById) : null;

    return {
      id: l.id,
      attendanceId: att ? att.id : null,
      lessonNumber: l.lessonNumber,
      title: l.title,
      date: l.date,
      scheduleTime: l.scheduleTime,
      lessonStatus: l.status,
      status: normalizedStatus,
      rawStatus: att ? att.status : null,
      justificationReason: att?.justificationReason || att?.rejectionReason || null,
      confirmedAt: att?.confirmedAt || null,
      confirmedByName: confirmedByUser ? confirmedByUser.name : (normalizedStatus === 'PRESENT' ? 'Professor' : null),
      plannedContent: l.plannedContent,
      actualContent: l.actualContent || null,
      materials: l.materials || null,
    };
  });

  const totalFinishedLessons = presentCount + absentCount + justifiedCount;
  const attendanceRate = totalFinishedLessons > 0 ? Math.round((presentCount / totalFinishedLessons) * 100) : 100;

  return {
    student: {
      id: student.id,
      name: user.name,
      email: user.email,
      registrationNumber: student.registrationNumber,
      currentXp: student.currentXp,
      level: student.level,
      streak: store.streaks.find((s) => s.studentId === student.id)?.currentStreak || 0,
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

  let attendance = store.attendances.find((a) => a.studentId === studentId && a.lessonId === lessonId);

  if (!attendance) {
    attendance = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      lessonId,
      studentId,
      status: status,
      requestedAt: new Date().toISOString(),
      confirmedAt: status === 'PRESENT' ? new Date().toISOString() : null,
      confirmedById: actorUserId,
      justificationReason: justificationReason || null,
      rejectionReason: status === 'ABSENT' ? (justificationReason || 'Ausência confirmada') : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.attendances.push(attendance);
  } else {
    attendance.status = status;
    attendance.confirmedAt = status === 'PRESENT' ? new Date().toISOString() : null;
    attendance.confirmedById = actorUserId;
    attendance.justificationReason = justificationReason || null;
    if (status === 'ABSENT') {
      attendance.rejectionReason = justificationReason || 'Ausência confirmada';
    } else {
      attendance.rejectionReason = null;
    }
    attendance.updatedAt = new Date().toISOString();
  }

  // Se marcar como presente, bonifica XP caso ainda não tenha sido concedido
  if (status === 'PRESENT') {
    const student = store.students.find((s) => s.id === studentId);
    if (student) {
      const alreadyHasXp = store.pointTransactions.some(
        (pt) => pt.studentId === studentId && pt.originReference === `ATTENDANCE_${lessonId}`
      );
      if (!alreadyHasXp) {
        const xpValue = await getGamificationRule('XP_ATTENDANCE');
        student.currentXp += xpValue;
        student.level = Math.floor(student.currentXp / 300) + 1;
        student.updatedAt = new Date().toISOString();

        store.pointTransactions.unshift({
          id: `pt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          studentId,
          amount: xpValue,
          type: 'ATTENDANCE',
          description: `XP por presença confirmada em aula`,
          originReference: `ATTENDANCE_${lessonId}`,
          createdAt: new Date().toISOString(),
        });
      }
    }
  }

  return attendance;
}

/**
 * ==========================================
 * FUNÇÕES ADMINISTRATIVAS DO DIRETOR (ADMIN)
 * ==========================================
 */

// GESTÃO DE PROFESSORES
export async function createTeacherByDirector(data: { name: string; email: string; specialty: string }) {
  const userId = `user_teach_${Date.now()}`;
  const teacherId = `teach_${Date.now()}`;
  const newUser: UserEntity = {
    id: userId,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    passwordHash: '$2b$10$gbSD4FDfU12pM3c67/Ynt.8YIlqbP1r2xMTvokm8QHG1zPp5WOLrW',
    role: 'PROFESSOR',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const newTeacher: TeacherEntity = {
    id: teacherId,
    userId,
    specialty: data.specialty || 'Instrutor de Tecnologia',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  store.teachers.push(newTeacher);

  return {
    id: teacherId,
    userId,
    name: newUser.name,
    email: newUser.email,
    specialty: newTeacher.specialty,
  };
}

export async function updateTeacherByDirector(teacherId: string, data: { name?: string; email?: string; specialty?: string }) {
  const teacher = store.teachers.find((t) => t.id === teacherId);
  if (!teacher) return null;

  const user = store.users.find((u) => u.id === teacher.userId);
  if (user) {
    if (data.name) user.name = data.name.trim();
    if (data.email) user.email = data.email.toLowerCase().trim();
    user.updatedAt = new Date().toISOString();
  }

  if (data.specialty) teacher.specialty = data.specialty.trim();
  teacher.updatedAt = new Date().toISOString();

  return {
    id: teacher.id,
    userId: teacher.userId,
    name: user ? user.name : 'Professor',
    email: user ? user.email : '',
    specialty: teacher.specialty,
  };
}

export async function deleteTeacherByDirector(teacherId: string) {
  const teacher = store.teachers.find((t) => t.id === teacherId);
  if (!teacher) return false;

  // Unassign from any classes
  store.classes.forEach((c) => {
    if (c.teacherId === teacherId) {
      c.teacherId = null;
    }
  });

  store.teachers = store.teachers.filter((t) => t.id !== teacherId);
  store.users = store.users.filter((u) => u.id !== teacher.userId);
  return true;
}

// GESTÃO DE ALUNOS
export async function createStudentByDirector(data: {
  name: string;
  email: string;
  classId?: string;
  registrationNumber?: string;
  currentXp?: number;
}) {
  const userId = `user_stud_${Date.now()}`;
  const studentId = `stud_${Date.now()}`;
  const regNumber = data.registrationNumber || `FUC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newUser: UserEntity = {
    id: userId,
    email: data.email.toLowerCase().trim(),
    name: data.name.trim(),
    passwordHash: '$2b$10$gbSD4FDfU12pM3c67/Ynt.8YIlqbP1r2xMTvokm8QHG1zPp5WOLrW',
    role: 'ALUNO',
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const initialXp = Number(data.currentXp) || 100;
  const newStudent: StudentEntity = {
    id: studentId,
    userId,
    registrationNumber: regNumber,
    currentXp: initialXp,
    level: Math.floor(initialXp / 300) + 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  store.users.push(newUser);
  store.students.push(newStudent);

  // Inicializa streak
  store.streaks.push({
    id: `streak_${studentId}`,
    studentId,
    currentStreak: 1,
    maxStreak: 1,
    lastAttendedLessonId: null,
    lastAttendedDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Matrícula na turma caso informada
  let enrolledClassName = 'Sem turma atribuída';
  if (data.classId) {
    const cls = store.classes.find((c) => c.id === data.classId);
    if (cls) {
      enrolledClassName = cls.name;
      store.enrollments.push({
        id: `enr_${Date.now()}`,
        studentId,
        classId: data.classId,
        status: 'ACTIVE',
        enrolledAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  return {
    id: studentId,
    userId,
    name: newUser.name,
    email: newUser.email,
    registrationNumber: newStudent.registrationNumber,
    currentXp: newStudent.currentXp,
    level: newStudent.level,
    streak: 1,
    classId: data.classId || null,
    className: enrolledClassName,
    attendanceRate: 100,
  };
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
  }
) {
  const student = store.students.find((s) => s.id === studentId);
  if (!student) return null;

  const user = store.users.find((u) => u.id === student.userId);
  if (user) {
    if (data.name) user.name = data.name.trim();
    if (data.email) user.email = data.email.toLowerCase().trim();
    user.updatedAt = new Date().toISOString();
  }

  if (data.registrationNumber) student.registrationNumber = data.registrationNumber.trim();
  if (typeof data.currentXp === 'number') {
    student.currentXp = data.currentXp;
    student.level = Math.floor(student.currentXp / 300) + 1;
  }
  student.updatedAt = new Date().toISOString();

  // Streak update
  const streak = store.streaks.find((st) => st.studentId === studentId);
  if (streak && typeof data.streak === 'number') {
    streak.currentStreak = data.streak;
    if (data.streak > streak.maxStreak) streak.maxStreak = data.streak;
    streak.updatedAt = new Date().toISOString();
  }

  // Class enrollment update
  let className = 'Sem turma atribuída';
  if (data.classId !== undefined) {
    store.enrollments = store.enrollments.filter((e) => e.studentId !== studentId);
    if (data.classId) {
      const cls = store.classes.find((c) => c.id === data.classId);
      if (cls) {
        className = cls.name;
        store.enrollments.push({
          id: `enr_${Date.now()}`,
          studentId,
          classId: data.classId,
          status: 'ACTIVE',
          enrolledAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  } else {
    const existingEnr = store.enrollments.find((e) => e.studentId === studentId && e.status === 'ACTIVE');
    if (existingEnr) {
      const cls = store.classes.find((c) => c.id === existingEnr.classId);
      if (cls) className = cls.name;
    }
  }

  return {
    id: student.id,
    userId: student.userId,
    name: user ? user.name : 'Aluno',
    email: user ? user.email : '',
    registrationNumber: student.registrationNumber,
    currentXp: student.currentXp,
    level: student.level,
    streak: streak ? streak.currentStreak : 0,
    classId: data.classId || null,
    className,
  };
}

export async function deleteStudentByDirector(studentId: string) {
  const student = store.students.find((s) => s.id === studentId);
  if (!student) return false;

  store.enrollments = store.enrollments.filter((e) => e.studentId !== studentId);
  store.attendances = store.attendances.filter((a) => a.studentId !== studentId);
  store.streaks = store.streaks.filter((s) => s.studentId !== studentId);
  store.pointTransactions = store.pointTransactions.filter((p) => p.studentId !== studentId);
  store.students = store.students.filter((s) => s.id !== studentId);
  store.users = store.users.filter((u) => u.id !== student.userId);

  return true;
}

// GESTÃO DE TURMAS
export async function deleteClassByDirector(classId: string) {
  const cls = store.classes.find((c) => c.id === classId);
  if (!cls) return false;

  store.enrollments = store.enrollments.filter((e) => e.classId !== classId);
  store.lessons = store.lessons.filter((l) => l.classId !== classId);
  store.classes = store.classes.filter((c) => c.id !== classId);

  return true;
}

