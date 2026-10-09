import { prisma } from './prisma';
export function reportFilters(params: URLSearchParams) {
  const type = params.get('type') ?? 'attendance';
  if (!['attendance', 'low-frequency', 'auctions'].includes(type)) throw new Error('Relatório inválido.');
  const from = params.get('from'), to = params.get('to');
  for (const value of [from, to]) if (value && (!/^\d{4}-\d{2}-\d{2}$/.test(value) || new Date(value).toISOString().slice(0, 10) !== value)) throw new Error('Data inválida.');
  if (from && to && from > to) throw new Error('Fim anterior ao início.');
  const threshold = Number(params.get('threshold') ?? 75);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) throw new Error('Limite de frequência inválido.');
  return { type, from, to, threshold, classId: params.get('classId') || undefined, seasonId: params.get('seasonId') || undefined };
}
export function toCsv(columns: string[], rows: (string | number | null)[][]) {
  const cell = (value: string | number | null) => {
    let text = value === null ? '' : String(value);
    if (typeof value === 'string' && /^[\s]*[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  };
  return '\uFEFF' + [columns, ...rows].map(row => row.map(cell).join(';')).join('\r\n');
}
export async function getReport(params: URLSearchParams) {
  const filters = reportFilters(params);
  const date = filters.from || filters.to ? { ...(filters.from ? { gte: new Date(filters.from) } : {}), ...(filters.to ? { lt: new Date(new Date(filters.to).getTime() + 86400000) } : {}) } : undefined;
  if (filters.type === 'auctions') {
    const items = await prisma.auctionItem.findMany({ where: { seasonId: filters.seasonId, endsAt: date }, orderBy: [{ endsAt: 'desc' }, { id: 'desc' }], take: 5001, select: { title: true, status: true, endsAt: true, totalBids: true, currentBid: true, highestBidderName: true, season: { select: { title: true } } } });
    if (items.length > 5000) throw new Error('Há mais de 5.000 lotes. Reduza o período ou selecione uma temporada.');
    return { columns: ['Temporada', 'Lote', 'Situação', 'Encerramento previsto', 'Lances', 'Valor atual (Coins)', 'Líder / vencedor'], rows: items.map(i => [i.season.title, i.title, ({ ACTIVE: 'Ativo', PAUSED: 'Pausado', FINISHED: 'Encerrado' })[i.status], i.endsAt.toISOString(), i.totalBids, i.currentBid, i.highestBidderName] as (string | number | null)[]), note: 'Valor e líder são provisórios nos lotes ativos. O período considera a data prevista de encerramento.' };
  }
  const enrollments = await prisma.enrollment.findMany({ where: { classId: filters.classId }, orderBy: [{ classId: 'asc' }, { id: 'asc' }], take: 5001, select: { studentId: true, classId: true, class: { select: { name: true } }, student: { select: { user: { select: { name: true } } } } } });
  if (enrollments.length > 5000) throw new Error('Há mais de 5.000 matrículas. Selecione uma turma.');
  const counts = await prisma.attendance.groupBy({ by: ['studentId', 'lessonId', 'status'], where: { studentId: { in: [...new Set(enrollments.map(e => e.studentId))] }, lesson: { classId: filters.classId, date } }, _count: { _all: true } });
  const lessons = await prisma.lesson.findMany({ where: { id: { in: [...new Set(counts.map(c => c.lessonId))] } }, select: { id: true, classId: true } });
  const classByLesson = new Map(lessons.map(l => [l.id, l.classId]));
  const byStudentClass = new Map<string, { present: number; absent: number; excused: number; pending: number }>();
  for (const count of counts) {
    const key = `${count.studentId}:${classByLesson.get(count.lessonId)}`;
    const totals = byStudentClass.get(key) ?? { present: 0, absent: 0, excused: 0, pending: 0 };
    const keyByStatus = { PRESENT: 'present', ABSENT: 'absent', EXCUSED: 'excused', PENDING: 'pending' } as const;
    totals[keyByStatus[count.status]] += count._count._all;
    byStudentClass.set(key, totals);
  }
  const rows = enrollments.flatMap(e => {
    const c = byStudentClass.get(`${e.studentId}:${e.classId}`) ?? { present: 0, absent: 0, excused: 0, pending: 0 };
    const resolved = c.present + c.absent + c.excused;
    const rate = resolved ? Math.round(c.present / resolved * 100) : null;
    if (filters.type === 'low-frequency' && (rate === null || rate >= filters.threshold)) return [];
    return [[e.class.name, e.student.user.name, c.present, c.absent, c.excused, c.pending, rate] as (string | number | null)[]];
  });
  return { columns: ['Turma', 'Aluno', 'Presenças', 'Ausências', 'Justificadas', 'Pendentes', 'Frequência (%)'], rows, note: 'Frequência = presenças / registros resolvidos. Pendências e aulas sem registro não geram faltas. Sem registros resolvidos, a frequência fica em branco.' };
}
