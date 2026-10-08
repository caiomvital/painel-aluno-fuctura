import { publicError } from '@/lib/operational-log';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getStudentDashboard } from '@/lib/academic-service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Não autenticado. Faça login para acessar o painel do aluno.' },
      { status: 401 }
    );
  }

  if (session.role !== 'ALUNO') {
    return NextResponse.json(
      { error: 'Acesso restrito. Apenas alunos podem acessar este painel.' },
      { status: 403 }
    );
  }

  try {
    const data = await getStudentDashboard(session.id);
    return NextResponse.json(data);
  } catch (error: any) {

    return NextResponse.json(
      { error: publicError(error, 'Erro ao carregar painel do aluno.', "student.dashboard.failed") },
      { status: 500 }
    );
  }
}
