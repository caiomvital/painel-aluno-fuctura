import { prisma } from './prisma';
import type { SessionUser } from './session-token';

export async function getPanelTasks(session: SessionUser) {
  const tasks: { id: string; title: string; detail: string; target: string; classId?: string }[] = [];
  let total = 0;
  if (session.role === 'DIRETOR') {
    const [registrations, count] = await Promise.all([
      prisma.registrationRequest.findMany({ where: { status: 'PENDING' }, take: 10, orderBy: { createdAt: 'asc' }, select: { id: true, user: { select: { name: true } } } }),
      prisma.registrationRequest.count({ where: { status: 'PENDING' } }),
    ]);
    total += count;
    tasks.push(...registrations.map(r => ({ id: r.id, title: 'Cadastro aguardando aprovação', detail: r.user.name, target: 'registrations' })));
  }
  if (session.role === 'DIRETOR' || session.role === 'PROFESSOR') {
    const teacher = session.role === 'PROFESSOR' ? await prisma.teacher.findUnique({ where: { userId: session.id }, select: { id: true } }) : null;
    if (session.role === 'PROFESSOR' && !teacher) return { tasks, total };
    const scope = teacher ? { class: { teacherId: teacher.id } } : {};
    const attendanceWhere = { status: 'PENDING' as const, lesson: scope };
    const diaryWhere = { ...scope, date: { lt: new Date() }, status: { not: 'CANCELLED' as const }, contents: { none: { contentType: 'TAUGHT' as const } } };
    const [attendances, attendanceCount, diaries, diaryCount] = await Promise.all([
      prisma.attendance.findMany({ where: attendanceWhere, take: 10, orderBy: { requestedAt: 'asc' }, select: { id: true, student: { select: { user: { select: { name: true } } } }, lesson: { select: { classId: true, title: true } } } }),
      prisma.attendance.count({ where: attendanceWhere }),
      prisma.lesson.findMany({ where: diaryWhere, take: 10, orderBy: { date: 'asc' }, select: { id: true, title: true, classId: true } }),
      prisma.lesson.count({ where: diaryWhere }),
    ]);
    total += attendanceCount + diaryCount;
    tasks.push(...attendances.map(a => ({ id: a.id, title: 'Presença aguardando revisão', detail: `${a.student.user.name} • ${a.lesson.title}`, classId: a.lesson.classId, target: 'attendance' })));
    tasks.push(...diaries.map(l => ({ id: l.id, title: 'Diário pendente', detail: l.title, classId: l.classId, target: 'diary' })));
  }
  if (session.role === 'ALUNO') {
    const student = await prisma.student.findUnique({ where: { userId: session.id }, select: { id: true, enrollments: { where: { status: 'ACTIVE' }, select: { classId: true } } } });
    if (student) {
      const next = await prisma.lesson.findFirst({ where: { classId: { in: student.enrollments.map(e => e.classId) }, status: { not: 'CANCELLED' }, date: { gte: new Date(new Date().toISOString().slice(0, 10)) } }, orderBy: [{ date: 'asc' }, { scheduleTime: 'asc' }], select: { id: true, title: true, date: true, scheduleTime: true } });
      if (next) { total++; tasks.push({ id: next.id, title: 'Sua próxima aula', detail: `${next.title} • ${next.date.toLocaleDateString('pt-BR', { timeZone: 'UTC' })} • ${next.scheduleTime}`, target: 'lessons' }); }
      const pending = await prisma.attendance.count({ where: { studentId: student.id, status: 'PENDING' } });
      if (pending) { total += pending; tasks.push({ id: 'pending-attendance', title: `${pending} presença(s) aguardando revisão`, detail: 'Acompanhe o resultado no seu histórico de aulas.', target: 'lessons' }); }
    }
  }
  return { tasks, total };
}
