import { trackedChange } from '@/lib/panel-events';
import { publicError } from '@/lib/operational-log';
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { confirmTeacherAttendance } from "@/lib/academic-service";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (session.role !== "PROFESSOR") {
    return NextResponse.json(
      { error: "Acesso restrito ao professor da turma." },
      { status: 403 },
    );
  }

  try {
    const { attendanceId } = await req.json();
    if (!attendanceId) {
      return NextResponse.json(
        { error: "ID da presença é obrigatório." },
        { status: 400 },
      );
    }

    // Professor só pode confirmar presença de aluno pertencente às suas turmas
    const attendance = await trackedChange(session, "Presença confirmada", attendanceId, undefined, () => confirmTeacherAttendance(attendanceId, session.id));
    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json(
      { error: publicError(error, "Erro ao confirmar presença.", "teacher.attendance.confirm.failed") },
      { status: error.statusCode || 400 },
    );
  }
}
