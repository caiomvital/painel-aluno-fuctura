import type { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { databaseContext } from './database-context';
import type { SessionUser } from './session-token';

export async function notifyUsers(tx: Prisma.TransactionClient, userIds: string[], data: { category: string; title: string; message: string; target: string }) {
  const ids = [...new Set(userIds)];
  if (ids.length) await tx.notification.createMany({ data: ids.map(userId => ({ userId, ...data })) });
}
export async function notifyClass(tx: Prisma.TransactionClient, classId: string, title: string, message: string) {
  const cls = await tx.class.findUnique({ where: { id: classId }, select: {
    teacher: { select: { userId: true } }, enrollments: { where: { status: 'ACTIVE' }, select: { student: { select: { userId: true } } } },
  } });
  if (cls) await notifyUsers(tx, [...cls.enrollments.map(e => e.student.userId), ...(cls.teacher ? [cls.teacher.userId] : [])], { category: 'ACADEMIC', title, message, target: 'lessons' });
}
export async function trackedChange<T>(session: SessionUser, action: string, entityId: string, reason: unknown, work: () => Promise<T>): Promise<T> {
  if (reason !== undefined && reason !== null && (typeof reason !== 'string' || reason.length > 500))
    throw Object.assign(new Error('O motivo deve ter no máximo 500 caracteres.'), { statusCode: 400 });
  return prisma.$transaction(async tx => databaseContext.run(tx, async () => {
    const result = await work();
    if (result === null || result === false || (typeof result === 'object' && result && 'success' in result && result.success === false)) return result;
    const row = result as { id?: string; title?: string; name?: string; classId?: string } | null;
    const resolvedId = entityId || row?.id || action;
    await tx.auditLog.create({ data: {
      actorId: session.id, actorName: session.name, action, entityId: resolvedId,
      summary: `${action}${row?.title || row?.name ? `: ${row.title || row.name}` : ''}`.slice(0, 300),
      reason: typeof reason === 'string' ? reason.trim() || null : null,
    } });
    if (action === 'Turma atualizada') await notifyClass(tx, resolvedId, 'Turma atualizada', 'Confira os dados e horários da sua turma.');
    return result;
  }), { maxWait: 10000, timeout: 30000 });
}
