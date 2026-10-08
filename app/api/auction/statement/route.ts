import { publicError } from "@/lib/operational-log";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStudentCoinTransactions } from "@/lib/auction-service";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.role !== "ALUNO") {
    return NextResponse.json(
      { error: "Acesso restrito a alunos." },
      { status: 403 },
    );
  }

  try {
    let studentId = session.studentId;
    if (!studentId && session.id) {
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
        { error: "Perfil de aluno não encontrado." },
        { status: 403 },
      );
    }

    const transactions = await getStudentCoinTransactions(studentId);
    return NextResponse.json({ transactions });
  } catch (error) {
    return NextResponse.json(
      {
        error: publicError(
          error,
          "Não foi possível consultar os dados.",
          "auction.read.failed",
        ),
      },
      { status: 503 },
    );
  }
}
