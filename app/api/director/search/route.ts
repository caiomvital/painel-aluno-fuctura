import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publicError } from '@/lib/operational-log';
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'DIRETOR') return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  const q = (new URL(request.url).searchParams.get('q') ?? '').trim();
  if (q.length < 2 || q.length > 100) return NextResponse.json({ error: 'Digite de 2 a 100 caracteres.' }, { status: 400 });
  const contains = { contains: q, mode: 'insensitive' as const };
  try {
    const [students, teachers, classes, auctions] = await Promise.all([
      prisma.student.findMany({ where: { OR: [{ user: { name: contains } }, { user: { email: contains } }, { registrationNumber: contains }] }, take: 11, orderBy: { id: 'asc' }, select: { id: true, user: { select: { name: true } } } }),
      prisma.teacher.findMany({ where: { user: { OR: [{ name: contains }, { email: contains }] } }, take: 11, orderBy: { id: 'asc' }, select: { id: true, user: { select: { name: true } } } }),
      prisma.class.findMany({ where: { OR: [{ name: contains }, { code: contains }] }, take: 11, orderBy: { id: 'asc' }, select: { id: true, name: true } }),
      prisma.auctionItem.findMany({ where: { title: contains }, take: 11, orderBy: { id: 'asc' }, select: { id: true, title: true } }),
    ]);
    return NextResponse.json({ results: [
      ...students.slice(0, 10).map(s => ({ id: s.id, name: s.user.name, kind: 'Aluno', target: 'students' })),
      ...teachers.slice(0, 10).map(t => ({ id: t.id, name: t.user.name, kind: 'Professor', target: 'teachers' })),
      ...classes.slice(0, 10).map(c => ({ id: c.id, name: c.name, kind: 'Turma', target: 'classes' })),
      ...auctions.slice(0, 10).map(a => ({ id: a.id, name: a.title, kind: 'Leilão', target: 'auction' })),
    ], limited: [students, teachers, classes, auctions].some(rows => rows.length > 10) });
  } catch (error) { return NextResponse.json({ error: publicError(error, 'Erro ao buscar.', 'search.read.failed') }, { status: 500 }); }
}
