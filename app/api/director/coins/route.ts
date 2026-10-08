import { publicError } from '@/lib/operational-log';
// app/api/director/coins/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { manualAdjustStudentCoins, getStudentCoinsSummary } from '@/lib/auction-service';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get('studentId');

    if (studentId) {
      const summary = await getStudentCoinsSummary(studentId);
      const transactions = await prisma.coinTransaction.findMany({
        where: { studentId },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json({ summary, transactions });
    }

    const students = await prisma.student.findMany({
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { currentXp: 'desc' },
    });

    return NextResponse.json({ students });
  } catch (err: any) {
    return NextResponse.json({ error: publicError(err, 'Erro ao consultar Coins.', "director.coins.failed") }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { studentId, amount, description } = body;

    if (!studentId || amount === undefined) {
      return NextResponse.json(
        { error: 'ID do aluno e quantidade de Coins são obrigatórios.' },
        { status: 400 }
      );
    }

    const result = await manualAdjustStudentCoins({
      studentId,
      amount: Number(amount),
      description: description || 'Ajuste manual de Coins pela Diretoria',
      directorUserId: session.id,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err: any) {
    return NextResponse.json(
      { error: publicError(err, 'Erro ao ajustar Coins.', "director.coins.failed") },
      { status: 400 }
    );
  }
}
