import { publicError } from '@/lib/operational-log';
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  enrollStudentByDirector,
  updateEnrollmentByDirector,
} from "@/lib/academic-service";
async function change(req: Request, editing: boolean) {
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
    const ids = editing
      ? [body.id, body.status]
      : [body.studentId, body.classId];
    if (ids.some((id) => typeof id !== "string" || !id.trim()))
      throw new Error("Identificadores e situação são obrigatórios.");
    const enrollment = editing
      ? await updateEnrollmentByDirector(body.id, body.status)
      : await enrollStudentByDirector(body.studentId, body.classId);
    return NextResponse.json({ enrollment });
  } catch (error: any) {
    return NextResponse.json(
      {
        error:
          error.code === "P2002"
            ? "Matrícula já existe."
            : publicError(error, "Erro ao salvar matrícula.", "director.enrollments.failed"),
      },
      { status: error.code === "P2002" ? 409 : error.statusCode || 400 },
    );
  }
}
export async function POST(req: Request) {
  return change(req, false);
}
export async function PUT(req: Request) {
  return change(req, true);
}
