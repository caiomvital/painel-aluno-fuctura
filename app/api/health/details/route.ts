import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { healthDetails } from "@/lib/health";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await getSession();
  if (!session)
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (session.role !== "DIRETOR")
    return NextResponse.json({ error: "Acesso restrito." }, { status: 403 });
  const details = await healthDetails();
  return NextResponse.json(details, {
    status: details.ready ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}
