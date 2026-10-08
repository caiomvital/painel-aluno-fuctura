/** Allowlisted structured logs: never serialize errors, request bodies or personal data. */
export function operationalLog(
  event: string,
  error?: unknown,
  metadata: { requestId?: string; status?: number } = {},
) {
  const candidate = error as
    | { code?: unknown; errorCode?: unknown; name?: unknown }
    | undefined;
  const code = candidate?.code ?? candidate?.errorCode;
  const allowedCode =
    typeof code === "string" && /^(P\d{4}|E[A-Z_]{2,40})$/.test(code)
      ? code
      : undefined;
  const record = {
    time: new Date().toISOString(),
    event: /^[a-z0-9_.-]{1,80}$/.test(event) ? event : "operation.failed",
    ...(allowedCode ? { code: allowedCode } : {}),
    ...(metadata.requestId && /^[a-f0-9-]{36}$/.test(metadata.requestId)
      ? { requestId: metadata.requestId }
      : {}),
    ...(Number.isInteger(metadata.status) ? { status: metadata.status } : {}),
  };
  console.error(JSON.stringify(record));
}
export function publicError(
  error: unknown,
  fallback: string,
  event = "api.operation.failed",
): string {
  operationalLog(event, error);
  const e = error as { code?: string; statusCode?: number };
  if (e?.code === "P2002")
    return "Registro já existe. Verifique os identificadores informados.";
  if (e?.code === "P2025" || e?.statusCode === 404)
    return "Registro não encontrado.";
  if (e?.statusCode === 403) return "Acesso negado ao recurso solicitado.";
  if (error instanceof SyntaxError) return "Corpo JSON inválido.";
  return fallback;
}
