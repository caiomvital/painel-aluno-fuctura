import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDirectorDashboard } from '@/lib/academic-service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Não autenticado. Faça login para acessar o painel da diretoria.' },
      { status: 401 }
    );
  }

  if (session.role !== 'DIRETOR') {
    return NextResponse.json(
      { error: 'Acesso restrito à Diretoria. Faça login com uma conta de Diretor.' },
      { status: 403 }
    );
  }

  try {
    const data = await getDirectorDashboard(session.id);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('Erro ao carregar dados da diretoria:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar painel da diretoria.' },
      { status: 500 }
    );
  }
}
