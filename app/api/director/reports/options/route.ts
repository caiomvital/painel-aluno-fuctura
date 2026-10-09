import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publicError } from '@/lib/operational-log';
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'DIRETOR') return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  try {
    const [classes, seasons] = await Promise.all([prisma.class.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }), prisma.auctionSeason.findMany({ orderBy: { createdAt: 'desc' }, select: { id: true, title: true } })]);
    return NextResponse.json({ classes, seasons });
  } catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao consultar filtros.', 'reports.options.failed') }, { status: 500 }); }
}
