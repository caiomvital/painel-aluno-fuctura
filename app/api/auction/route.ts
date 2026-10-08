import { publicError } from '@/lib/operational-log';
// app/api/auction/route.ts
import { NextResponse } from 'next/server';
import { getAuctionOverview, placeAuctionBid } from '@/lib/auction-service';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({error:'Não autenticado.'},{status:401});
    let studentId = session.studentId;

    if (!studentId && session?.id) {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
        select: { id: true },
      });
      if (student) {
        studentId = student.id;
      }
    }

    const overview = await getAuctionOverview(studentId, false);
    return NextResponse.json(overview);
  } catch (err: any) {

    return NextResponse.json(
      { error: publicError(err, 'Erro ao consultar leilão.', "auction.failed") },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, amount } = body;

    if (typeof itemId !== 'string' || !itemId || !Number.isSafeInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'ID do item e valor do lance são obrigatórios.' },
        { status: 400 }
      );
    }

    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Autenticação necessária para dar lances no leilão.' },
        { status: 401 }
      );
    }

    if (session.role !== 'ALUNO') {
      return NextResponse.json(
        { error: 'Apenas alunos matriculados podem enviar lances no leilão.' },
        { status: 403 }
      );
    }

    let studentId = session.studentId;
    if (!studentId) {
      const student = await prisma.student.findUnique({
        where: { userId: session.id },
        select: { id: true },
      });
      if (student) {
        studentId = student.id;
      }
    }

    if (!studentId) {
      return NextResponse.json(
        { error: 'Perfil de aluno não localizado para a sessão atual.' },
        { status: 403 }
      );
    }

    const bidderDisplayName = session.name;
    const result = await placeAuctionBid(
      itemId,
      studentId,
      Number(amount),
      bidderDisplayName
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      item: result.item,
      studentCoins: result.studentCoins,
      myBids: result.myBids,
    });
  } catch (err: any) {

    return NextResponse.json(
      { error: publicError(err, 'Erro ao processar lance.', "auction.failed") },
      { status: 500 }
    );
  }
}
