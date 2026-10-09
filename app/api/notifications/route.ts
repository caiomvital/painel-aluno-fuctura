import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { readPreferences, notificationCategories } from '@/lib/panel-preferences';
import { publicError } from '@/lib/operational-log';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  const page = Number(new URL(request.url).searchParams.get('page') ?? 1);
  if (!Number.isSafeInteger(page) || page < 1 || page > 1000000) return NextResponse.json({ error: 'Página inválida.' }, { status: 400 });
  try {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: session.id }, select: { preferences: true } });
    const preferences = readPreferences(user.preferences);
    const where = { userId: session.id, category: { in: notificationCategories.filter(c => preferences.notifications[c]) } };
    const [rows, unread] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 25, take: 26, select: { id: true, category: true, title: true, message: true, target: true, readAt: true, createdAt: true } }),
      prisma.notification.count({ where: { ...where, readAt: null } }),
    ]);
    return NextResponse.json({ notifications: rows.slice(0, 25), hasMore: rows.length > 25, unread });
  } catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao consultar avisos.', 'notifications.read.failed') }, { status: 500 }); }
}
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  try {
    const body = await request.json();
    if (typeof body.id !== 'string' || !body.id) return NextResponse.json({ error: 'Aviso obrigatório.' }, { status: 400 });
    const result = await prisma.notification.updateMany({ where: { id: body.id, userId: session.id, readAt: null }, data: { readAt: new Date() } });
    return NextResponse.json({ updated: result.count });
  } catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao atualizar aviso.', 'notifications.update.failed') }, { status: 500 }); }
}
