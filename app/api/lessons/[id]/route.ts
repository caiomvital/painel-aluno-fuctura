import { trackedChange } from '@/lib/panel-events';
import { publicError } from '@/lib/operational-log';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getLessonWithDiary, updateLessonDiary } from '@/lib/academic-service';

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
    return NextResponse.json({ error: 'ID da aula é obrigatório.' }, { status: 400 });
  }

  try {
    const data = await getLessonWithDiary(id, session);
    return NextResponse.json(data);
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: publicError(error, 'Erro ao carregar diário de aula.', "lessons.resource.failed") },
      { status }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: 'ID da aula é obrigatório.' }, { status: 400 });
  }

  try {
    const body = await req.json();
    const { plannedTopics, taughtTopics, materials } = body;

    const updated = await trackedChange(session, "Diário atualizado", id, body.reason, () => updateLessonDiary(
      id,
      {
        plannedTopics,
        taughtTopics,
        materials,
      },
      session
    ));

    return NextResponse.json({
      success: true,
      message: 'Diário de aula atualizado com sucesso.',
      lesson: updated,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: publicError(error, 'Erro ao atualizar diário de aula.', "lessons.resource.failed") },
      { status }
    );
  }
}
