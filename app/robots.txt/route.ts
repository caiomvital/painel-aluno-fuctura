import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return new NextResponse(
    `User-agent: *\n${process.env.APP_ENV === "staging" ? "Disallow: /" : "Allow: /"}\n`,
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}
