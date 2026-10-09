import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publicError } from '@/lib/operational-log';
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'DIRETOR') return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const q = (params.get('q') ?? '').trim(), page = Number(params.get('page') ?? 1);
  if (q.length > 100 || !Number.isSafeInteger(page) || page < 1 || page > 1000000) return NextResponse.json({ error: 'Filtro inválido.' }, { status: 400 });
  try {
    const rows = await prisma.auditLog.findMany({
      where: q ? { OR: ['actorName', 'action', 'entityId', 'summary', 'reason'].map(field => ({ [field]: { contains: q, mode: 'insensitive' } })) } : {},
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * 25, take: 26,
      select: { id: true, actorName: true, action: true, entityId: true, summary: true, reason: true, createdAt: true },
    });
    return NextResponse.json({ entries: rows.slice(0, 25), hasMore: rows.length > 25 });
  } catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao consultar histórico.', 'history.read.failed') }, { status: 500 }); }
}
