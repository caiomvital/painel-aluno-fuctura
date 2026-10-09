import { trackedChange } from '@/lib/panel-events';
import { publicError } from '@/lib/operational-log';
// app/api/director/auction/route.ts
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  getAuctionOverview,
  closeAuctionItem,
  createAuctionItemByDirector,
  updateAuctionItemByDirector,
  deleteAuctionItemByDirector,
  updateAuctionSettingsByDirector,
} from '@/lib/auction-service';

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR") return NextResponse.json({ error: "Acesso restrito à diretoria." }, { status: 403 });
  try {
    const overview = await getAuctionOverview(undefined, false);
    const hasSeason = await prisma.auctionSeason.count();
    const bids = await prisma.auctionBid.findMany({ take: 100, orderBy: { createdAt: "desc" }, select: { id: true, amount: true, bidderName: true, createdAt: true, item: { select: { title: true } } } });
    return NextResponse.json({
      items: overview.items,
      bids,
      settings: hasSeason ? overview.settings : null,
    });
  } catch (err: any) {

    return NextResponse.json(
      { error: publicError(err, 'Erro ao consultar leilão.', "director.auction.failed") },
      { status: 500 }
    );
  }
}

// Criar novo item de leilão ou atualizar configurações globais
export async function POST(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const body = await req.json();

    if (body.action === 'CLOSE_ITEM') {
      if (typeof body.itemId !== 'string' || !body.itemId) return NextResponse.json({error:'Item obrigatório.'}, {status:400});
      const item = await trackedChange(session, "Lote encerrado", body.itemId, body.reason, () => closeAuctionItem(body.itemId));
      return NextResponse.json({success:true,item});
    }
    // Se for atualização de configurações da temporada/datas do leilão
    if (body.action === 'UPDATE_SETTINGS') {
      const updated = await trackedChange(session, "Temporada atualizada", '', body.reason, () => updateAuctionSettingsByDirector({
        seasonTitle: body.seasonTitle,
        status: body.status,
        endDate: body.endDate,
        minBidIncrement: body.minBidIncrement ? Number(body.minBidIncrement) : undefined,
      }));

      if (!updated) {
        return NextResponse.json(
          { error: 'Temporada não encontrada para atualização.' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, settings: updated });
    }

    // Criar novo item
    const { title, category, description, marketValue, minNextBid, iconType, isFeatured, endsInSeconds } = body;
    if (!title || !category || !description) {
      return NextResponse.json({ error: 'Título, categoria e descrição são obrigatórios.' }, { status: 400 });
    }

    const newItem = await trackedChange(session, "Lote criado", '', body.reason, () => createAuctionItemByDirector({
      title,
      category,
      description,
      marketValue: marketValue || 'R$ 0,00',
      minNextBid: Number(minNextBid) || 100,
      iconType: iconType || 'keyboard',
      isFeatured: !!isFeatured,
      endsInSeconds: Number(endsInSeconds) || 3600 * 48,
    }));

    return NextResponse.json({ success: true, item: newItem });
  } catch (err: any) {

    return NextResponse.json({ error: publicError(err, 'Erro ao processar item do leilão.', "director.auction.failed") }, { status: 500 });
  }
}

// Atualizar item existente
export async function PUT(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json({ error: 'ID do item é obrigatório.' }, { status: 400 });
    }

    const updated = await trackedChange(session, "Lote atualizado", id, body.reason, () => updateAuctionItemByDirector(id, data));
    if (!updated) {
      return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, item: updated });
  } catch (err: any) {

    return NextResponse.json({ error: publicError(err, 'Erro ao atualizar item do leilão.', "director.auction.failed") }, { status: 500 });
  }
}

// Remover item do leilão
export async function DELETE(req: Request) {
  const session = await getSession();
  if (!session || session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    }

    const removed = await trackedChange(session, "Lote excluído", id, searchParams.get('reason'), () => deleteAuctionItemByDirector(id));
    if (!removed) {
      return NextResponse.json({ error: 'Item não encontrado para remoção.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Item removido do leilão com sucesso.' });
  } catch (err: any) {

    return NextResponse.json({ error: publicError(err, 'Erro ao remover item do leilão.', "director.auction.failed") }, { status: 500 });
  }
}
