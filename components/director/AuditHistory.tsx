'use client';
import { useEffect, useState } from 'react';
import { panelApi, panelButton, panelField } from '../layout/panel-ui';
type Entry = { id: string; actorName: string; action: string; entityId: string; summary: string; reason: string | null; createdAt: string };
export function AuditHistory() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<{ entries: Entry[]; hasMore: boolean } | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    panelApi<{ entries: Entry[]; hasMore: boolean }>(`/api/director/history?q=${encodeURIComponent(filter)}&page=${page}`, { signal: controller.signal }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [filter, page, retry]);
  function clear() { setData(null); setError(''); }
  return <section className="space-y-3">
    <p className="text-xs text-slate-400">Histórico das operações realizadas após a ativação deste recurso. Motivos aparecem quando informados pelo responsável.</p>
    <form onSubmit={e => { e.preventDefault(); clear(); setFilter(query); setPage(1); setRetry(retry + 1); }}><label className="block text-sm">Filtrar por responsável, ação, registro ou motivo<input className={panelField} maxLength={100} value={query} onChange={e => setQuery(e.target.value)} /></label><button className={`${panelButton} mt-2`}>Consultar histórico</button></form>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {!data && !error && <p role="status">Carregando histórico…</p>}
    {data?.entries.length === 0 && <p>Nenhuma operação encontrada.</p>}
    {data?.entries.map(entry => <article key={entry.id} className="space-y-1 rounded-xl border border-slate-800 p-3 text-sm"><h3 className="font-semibold">{entry.summary}</h3><p>{entry.actorName} • {new Date(entry.createdAt).toLocaleString('pt-BR')}</p><p className="break-all text-xs text-slate-400">Registro: {entry.entityId}</p><p className="break-words text-slate-300">Motivo: {entry.reason || 'Não informado'}</p></article>)}
    {data && <div className="flex justify-between gap-2"><button className={panelButton} disabled={page === 1} onClick={() => { clear(); setPage(page - 1); }}>Anterior</button><span>Página {page}</span><button className={panelButton} disabled={!data.hasMore} onClick={() => { clear(); setPage(page + 1); }}>Próxima</button></div>}
  </section>;
}
