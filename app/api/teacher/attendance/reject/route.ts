import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { rejectTeacherAttendance } from "@/lib/academic-service";

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
    const { attendanceId, reason } = await req.json();
    if (!attendanceId) {
      return NextResponse.json(
        { error: "ID da presença é obrigatório." },
        { status: 400 },
      );
    }

    const attendance = await rejectTeacherAttendance(
      attendanceId,
      session.id,
      reason,
    );
    return NextResponse.json({ success: true, attendance });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Erro ao recusar presença." },
      { status: error.statusCode || 400 },
    );
  }
}
