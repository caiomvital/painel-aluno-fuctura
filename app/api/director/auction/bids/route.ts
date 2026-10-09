import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { publicError } from '@/lib/operational-log';

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  if (session.role !== 'DIRETOR') return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  const params = new URL(request.url).searchParams;
  const itemId = params.get('itemId');
  const page = Number(params.get('page') ?? '1');
  if (!itemId || !Number.isSafeInteger(page) || page < 1 || page > 1000000) {
    return NextResponse.json({ error: 'Lote ou página inválidos.' }, { status: 400 });
  }
  try {
    const item = await prisma.auctionItem.findUnique({ where: { id: itemId }, select: { id: true } });
    if (!item) return NextResponse.json({ error: 'Lote não encontrado.' }, { status: 404 });
    const rows = await prisma.auctionBid.findMany({
      where: { itemId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * 25,
      take: 26,
      select: { id: true, bidderName: true, amount: true, createdAt: true },
    });
    return NextResponse.json({ bids: rows.slice(0, 25), hasMore: rows.length > 25 });
  } catch (error) {
    return NextResponse.json({ error: publicError(error, 'Erro ao consultar lances.', 'director.auction.bids.failed') }, { status: 500 });
  }
}
