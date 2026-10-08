import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createClassByDirector,
  updateClassByDirector,
  deleteClassByDirector,
} from '@/lib/academic-service';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const {
      name,
      code,
      courseId,
      teacherId,
      daysOfWeek,
      scheduleTime,
      durationMinutes,
      lessonsPerWeek,
      startDate,
      endDate,
    } = body;

    if (!name || !code || !courseId || !daysOfWeek || !scheduleTime) {
      return NextResponse.json({ error: 'Todos os campos obrigatórios da turma devem ser informados.' }, { status: 400 });
    }

    const newClass = await createClassByDirector({
      name,
      code,
      courseId,
      teacherId: teacherId || null,
      daysOfWeek,
      scheduleTime,
      durationMinutes: durationMinutes === undefined ? 180 : Number(durationMinutes),
      lessonsPerWeek: lessonsPerWeek === undefined ? 1 : Number(lessonsPerWeek),
      startDate: startDate || new Date().toISOString(),
      endDate,
    });

    return NextResponse.json({ success: true, class: newClass });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar turma.' }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { classId, ...data } = body;

    if (!classId) {
      return NextResponse.json({ error: 'ID da turma é obrigatório.' }, { status: 400 });
    }

    const updated = await updateClassByDirector(classId, data);
    return NextResponse.json({ success: true, class: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar turma.' }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const classId = searchParams.get('id');
    if (!classId) {
      return NextResponse.json({ error: 'ID da turma é obrigatório.' }, { status: 400 });
    }

    const removed = await deleteClassByDirector(classId);
    if (!removed) {
      return NextResponse.json({ error: 'Turma não encontrada para remoção.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Turma removida com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao remover turma.' }, { status: 400 });
  }
}
