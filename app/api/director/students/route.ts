import { publicError } from '@/lib/operational-log';
// app/api/director/students/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  createStudentByDirector,
  updateStudentByDirector,
  deleteStudentByDirector,
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
    return NextResponse.json({ students: data.students });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao listar alunos.', "director.students.failed") }, { status: 500 });
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
    const { name, email, classId, registrationNumber, currentXp, initialPassword } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'Nome e e-mail são obrigatórios.' }, { status: 400 });
    }

    const student = await createStudentByDirector({
      name,
      email,
      initialPassword,
      classId,
      registrationNumber,
      currentXp: currentXp ? Number(currentXp) : 100,
    });

    return NextResponse.json({ success: true, student });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao matricular aluno.', "director.students.failed") }, { status: 400 });
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
    const { id, name, email, classId, registrationNumber, currentXp, streak } = body;

    if (!id) {
      return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    const updated = await updateStudentByDirector(
      id,
      {
        name,
        email,
        classId,
        registrationNumber,
        currentXp: currentXp !== undefined ? Number(currentXp) : undefined,
        streak: streak !== undefined ? Number(streak) : undefined,
      },
      session.id
    );

    if (!updated) {
      return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, student: updated });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao atualizar aluno.', "director.students.failed") }, { status: 400 });
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
      return NextResponse.json({ error: 'ID do aluno é obrigatório.' }, { status: 400 });
    }

    const removed = await deleteStudentByDirector(id);
    if (!removed) {
      return NextResponse.json({ error: 'Aluno não encontrado.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Aluno removido com sucesso.' });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao remover aluno.', "director.students.failed") }, { status: 400 });
  }
}
