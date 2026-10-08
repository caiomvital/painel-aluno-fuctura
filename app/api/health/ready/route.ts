import { NextResponse } from "next/server";
import { readiness } from "@/lib/health";
export const dynamic = "force-dynamic";
export async function GET() {
  const ready = await readiness();
  return NextResponse.json(
    { status: ready ? "ready" : "unavailable" },
    { status: ready ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
