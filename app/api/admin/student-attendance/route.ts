import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getStudentAttendanceHistory,
  updateStudentAttendanceRecord,
} from "@/lib/academic-service";

export async function GET(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Permissão restrita: Apenas Professor e Diretor autenticados podem gerenciar frequência
  if (session.role !== "PROFESSOR" && session.role !== "DIRETOR") {
    return NextResponse.json(
      {
        error:
          "Acesso restrito. Apenas Professores e a Diretoria podem gerenciar a frequência escolar.",
      },
      { status: 403 },
    );
  }

  try {
    const searchParams = req.nextUrl.searchParams;
    const studentId = searchParams.get("studentId");
    if (!studentId)
      return NextResponse.json(
        { error: "studentId obrigatório." },
        { status: 400 },
      );

    const data = await getStudentAttendanceHistory(studentId, session);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Erro ao buscar histórico de frequência do aluno:", error);
    return NextResponse.json(
      {
        error: error.message || "Erro ao carregar frequência escolar do aluno.",
      },
      { status: error.statusCode || 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // Permissão restrita: Apenas Professor e Diretor autenticados
  if (session.role !== "PROFESSOR" && session.role !== "DIRETOR") {
    return NextResponse.json(
      {
        error:
          "Acesso não autorizado. Apenas Professores e Diretores autenticados podem alterar a frequência escolar.",
      },
      { status: 403 },
    );
  }

  try {
    const body = await req.json();
    const { studentId, lessonId, status, justificationReason } = body;

    if (!studentId || !lessonId || !status) {
      return NextResponse.json(
        {
          error:
            "studentId, lessonId e status (PRESENT, ABSENT, EXCUSED) são obrigatórios.",
        },
        { status: 400 },
      );
    }

    if (!["PRESENT", "ABSENT", "EXCUSED"].includes(status)) {
      return NextResponse.json(
        { error: "Status inválido. Use PRESENT, ABSENT ou EXCUSED." },
        { status: 400 },
      );
    }

    const actorUserId = session.id;

    const attendance = await updateStudentAttendanceRecord({
      studentId,
      lessonId,
      status,
      justificationReason,
      actorUserId,
    });

    const updatedHistory = await getStudentAttendanceHistory(
      studentId,
      session,
    );

    return NextResponse.json({
      success: true,
      message: `Frequência atualizada com sucesso para ${status}.`,
      attendance,
      history: updatedHistory,
    });
  } catch (error: any) {
    console.error("Erro ao atualizar frequência escolar:", error);
    return NextResponse.json(
      { error: error.message || "Erro ao atualizar frequência escolar." },
      { status: error.statusCode || 500 },
    );
  }
}
