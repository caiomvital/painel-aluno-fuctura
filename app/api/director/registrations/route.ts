import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  listRegistrations,
  reviewRegistration,
} from "@/lib/registration-service";
import { operationalLog } from "@/lib/operational-log";
function failed(error: unknown) {
  operationalLog("registration.review.failed", error);
  const status = (error as { statusCode?: number }).statusCode;
  return NextResponse.json(
    {
      error:
        status && [400, 403, 404, 409].includes(status)
          ? (error as Error).message
          : "Falha ao consultar ou aprovar cadastros.",
    },
    { status: status && [400, 403, 404, 409].includes(status) ? status : 500 },
  );
}
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR")
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  try {
    return NextResponse.json({
      registrations: await listRegistrations(session.id),
    });
  } catch (error) {
    return failed(error);
  }
}
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR")
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  try {
    let body;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Corpo JSON inválido." },
        { status: 400 },
      );
    }
    if (
      !body ||
      typeof body.id !== "string" ||
      typeof body.decision !== "string"
    )
      return NextResponse.json(
        { error: "Solicitação ou decisão inválida." },
        { status: 400 },
      );
    return NextResponse.json({
      registration: await reviewRegistration(
        session.id,
        body.id,
        body.decision,
      ),
    });
  } catch (error) {
    return failed(error);
  }
}
