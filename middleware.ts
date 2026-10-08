import { NextRequest, NextResponse } from "next/server";
import { permittedMutation } from "./lib/request-security";
import { productionConfiguration } from "./lib/production-config";
import { operationalLog } from "./lib/operational-log";
export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const headers = { "Cache-Control": "no-store", "X-Request-Id": requestId };
  // Health live/ready remain available to distinguish a live process from invalid configuration.
  if (
    process.env.NODE_ENV === "production" &&
    !["/api/health/live", "/api/health/ready"].includes(
      request.nextUrl.pathname,
    )
  ) {
    try {
      productionConfiguration();
    } catch {
      operationalLog("api.configuration.invalid", undefined, {
        requestId,
        status: 503,
      });
      return NextResponse.json(
        { error: "Serviço temporariamente indisponível." },
        { status: 503, headers },
      );
    }
  }
  if (!permittedMutation(request))
    return NextResponse.json(
      { error: "Origem da solicitação recusada." },
      { status: 403, headers },
    );
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestId);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  for (const [name, value] of Object.entries(headers))
    response.headers.set(name, value);
  return response;
}
export const config = { matcher: "/api/:path*" };
