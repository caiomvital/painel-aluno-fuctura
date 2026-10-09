import { trackedChange } from '@/lib/panel-events';
import { publicError } from '@/lib/operational-log';
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  confirmTeacherAttendance,
  rejectTeacherAttendance,
} from "@/lib/academic-service";
export async function POST(req: Request) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR")
    return NextResponse.json(
      { error: "Acesso restrito à diretoria." },
      { status: 403 },
    );
  try {
    const body = await req.json();
    if (
      typeof body.attendanceId !== "string" ||
      !body.attendanceId ||
      !["CONFIRM", "REJECT"].includes(body.action) ||
      (body.reason !== undefined && typeof body.reason !== "string")
    )
      throw new Error("Solicitação inválida.");
    const attendance =
      body.action === "CONFIRM"
        ? await trackedChange(session, "Presença confirmada", body.attendanceId, body.reason, () => confirmTeacherAttendance(body.attendanceId, session.id))
        : await trackedChange(session, "Presença rejeitada", body.attendanceId, body.reason, () => rejectTeacherAttendance(
            body.attendanceId,
            session.id,
            body.reason,
          ));
    return NextResponse.json({ attendance });
  } catch (error: any) {
    return NextResponse.json(
      { error: publicError(error, "Erro ao resolver presença.", "director.attendance.failed") },
      { status: error.statusCode || 400 },
    );
  }
}
