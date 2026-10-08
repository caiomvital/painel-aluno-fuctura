export const buttonClass =
  "rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200 hover:bg-cyan-500/20 disabled:opacity-40";
export const fieldClass =
  "mt-1 w-full min-w-0 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white";
export async function api(
  url: string,
  method?: string,
  body?: unknown,
  signal?: AbortSignal,
) {
  const response = await fetch(url, {
    method,
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json();
  if (!response.ok)
    throw new Error(json.error || "Não foi possível carregar os dados.");
  return json;
}
export const statusLabel: Record<string, string> = {
  ACTIVE: "Ativa",
  FINISHED: "Encerrada",
  UPCOMING: "Em breve",
  COMPLETED: "Concluída",
  DROPPED: "Cancelada",
  PENDING: "Pendente",
  PRESENT: "Confirmada",
  ABSENT: "Falta registrada",
  EXCUSED: "Justificada",
  SCHEDULED: "Programada",
  IN_PROGRESS: "Em andamento",
  CANCELLED: "Cancelada",
};
export function dateLabel(date: string) {
  return new Date(date).toLocaleDateString("pt-BR", { timeZone: "UTC" });
}
