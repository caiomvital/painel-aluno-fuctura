export const panelButton = 'rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50';
export const panelField = 'mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-2 text-sm text-slate-100';
export async function panelApi<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { cache: 'no-store', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? 'Erro ao carregar dados.');
  return data;
}
