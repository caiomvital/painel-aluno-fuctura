import { publicError } from '@/lib/operational-log';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { requestStudentAttendance } from '@/lib/academic-service';

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });
  }

  if (session.role !== 'ALUNO') {
    return NextResponse.json({ error: 'Apenas alunos autenticados podem solicitar presença.' }, { status: 403 });
  }

  try {
    const { lessonId } = await req.json();
    if (typeof lessonId !== 'string' || !lessonId) {
      return NextResponse.json({ error: 'ID da aula é obrigatório.' }, { status: 400 });
    }

    // Aluno só pode solicitar presença para si próprio (usando session.id)
    const attendance = await requestStudentAttendance(lessonId, session.id);
    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json({ error: publicError(error, 'Erro ao registrar solicitação de presença.', "student.attendance.failed") }, { status: error.statusCode || 400 });
  }
}
