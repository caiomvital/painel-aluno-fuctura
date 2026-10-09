'use client';
import { useState } from 'react';
import { panelApi, panelButton, panelField } from '../layout/panel-ui';
import { navigatePanel } from '@/lib/panel-navigation';
type Result = { id: string; name: string; kind: string; target: string };
export function DirectorSearch({ onNavigate }: { onNavigate: () => void }) {
  const [query, setQuery] = useState('');
  const [data, setData] = useState<{ results: Result[]; limited: boolean } | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function search(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setData(null);
    try { setData(await panelApi(`/api/director/search?q=${encodeURIComponent(query)}`)); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="space-y-3">
    <form onSubmit={search} className="space-y-3"><label className="block text-sm">Buscar aluno, professor, turma ou leilão<input className={panelField} value={query} minLength={2} maxLength={100} required onChange={e => setQuery(e.target.value)} /></label><button className={panelButton} disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button></form>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {data?.results.length === 0 && <p>Nenhum resultado encontrado.</p>}
    {data?.results.map(result => <button key={`${result.kind}:${result.id}`} className={`${panelButton} block w-full text-left`} onClick={() => { navigatePanel({ target: result.target, id: result.id }); onNavigate(); }}><span className="text-xs text-slate-400">{result.kind}</span><span className="block break-words">{result.name}</span></button>)}
    {data?.limited && <p className="text-xs text-slate-400">Até 10 resultados por categoria. Refine a busca para encontrar outros registros.</p>}
  </section>;
}
