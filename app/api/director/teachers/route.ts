import { publicError } from '@/lib/operational-log';
// app/api/director/teachers/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createTeacherByDirector,
  updateTeacherByDirector,
  deleteTeacherByDirector,
  getDirectorDashboard,
} from '@/lib/academic-service';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (session.role !== 'DIRETOR') {
    return NextResponse.json({ error: 'Acesso restrito à diretoria.' }, { status: 403 });
  }

  try {
    const data = await getDirectorDashboard(session.id);
    return NextResponse.json({ teachers: data.teachers });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao listar professores.', "director.teachers.failed") }, { status: 500 });
  }
}

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
    const { name, email, specialty, initialPassword } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    const teacher = await createTeacherByDirector({ name, email, specialty, initialPassword });
    return NextResponse.json({ success: true, teacher });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao criar professor.', "director.teachers.failed") }, { status: 400 });
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
    const { id, name, email, specialty } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do professor é obrigatório.' }, { status: 400 });
    }

    const updated = await updateTeacherByDirector(id, { name, email, specialty });
    if (!updated) {
      return NextResponse.json({ error: 'Professor não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, teacher: updated });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao atualizar professor.', "director.teachers.failed") }, { status: 400 });
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
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID do professor é obrigatório.' }, { status: 400 });
    }

    const removed = await deleteTeacherByDirector(id);
    if (!removed) {
      return NextResponse.json({ error: 'Professor não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Professor removido com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao remover professor.', "director.teachers.failed") }, { status: 400 });
  }
}
