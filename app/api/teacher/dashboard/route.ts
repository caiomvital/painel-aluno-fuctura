import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getTeacherDashboard } from '@/lib/academic-service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Não autenticado. Faça login para acessar o painel do professor.' },
      { status: 401 }
    );
  }

  if (session.role !== 'PROFESSOR') {
    return NextResponse.json(
      { error: 'Acesso restrito ao corpo docente. Faça login como professor.' },
      { status: 403 }
    );
  }

  try {
    // Derive o Teacher através do User autenticado (session.id)
    const data = await getTeacherDashboard(session.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao carregar dados do professor:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar painel do professor.' },
      { status: 500 }
    );
  }
}
