import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getClassLessonsWithDiary } from '@/lib/academic-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID da turma é obrigatório.' }, { status: 400 });
  }

  try {
    const lessons = await getClassLessonsWithDiary(id, session);
    return NextResponse.json({ lessons });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || 'Erro ao carregar aulas da turma.' },
      { status }
    );
  }
}
