'use client';
import { useEffect, useState } from 'react';
import { panelApi, panelButton, panelField } from '../layout/panel-ui';
type Report = { columns: string[]; rows: (string | number | null)[][]; note: string };
export function DirectorReports() {
  const [type, setType] = useState('attendance');
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [classId, setClassId] = useState(''); const [seasonId, setSeasonId] = useState('');
  const [threshold, setThreshold] = useState('75');
  const [options, setOptions] = useState<{ classes: { id: string; name: string }[]; seasons: { id: string; title: string }[] } | null>(null);
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ data: Report; params: string } | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    panelApi<NonNullable<typeof options>>('/api/director/reports/options', { signal: controller.signal }).then(setOptions).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, []);
  async function generate(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setResult(null);
    const params = new URLSearchParams({ type, from, to, classId, seasonId, threshold }).toString();
    try { setResult({ data: await panelApi<Report>(`/api/director/reports?${params}`), params }); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function download() {
    if (!result) return; setBusy(true); setError('');
    try {
      const response = await fetch(`/api/director/reports?${result.params}&format=csv`);
      if (!response.ok) throw new Error((await response.json()).error || 'Erro ao exportar.');
      const url = URL.createObjectURL(await response.blob()); const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'fuctura-relatorio.csv'; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <section className="space-y-4">
    <form onSubmit={generate} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Relatório<select className={panelField} value={type} onChange={e => setType(e.target.value)}><option value="attendance">Frequência por turma</option><option value="low-frequency">Alunos com baixa frequência</option><option value="auctions">Resultados dos leilões</option></select></label>
      {type === 'auctions' ? <label className="text-sm">Temporada<select className={panelField} value={seasonId} onChange={e => setSeasonId(e.target.value)}><option value="">Todas</option>{options?.seasons.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}</select></label> : <label className="text-sm">Turma<select className={panelField} value={classId} onChange={e => setClassId(e.target.value)}><option value="">Todas</option>{options?.classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>}
      <label className="text-sm">De<input type="date" className={panelField} value={from} onChange={e => setFrom(e.target.value)} /></label><label className="text-sm">Até<input type="date" className={panelField} value={to} onChange={e => setTo(e.target.value)} /></label>
      {type === 'low-frequency' && <label className="text-sm">Frequência abaixo de (%)<input className={panelField} type="number" min={0} max={100} value={threshold} onChange={e => setThreshold(e.target.value)} /></label>}
      <button disabled={busy} className={`${panelButton} self-end`}>{busy ? 'Gerando…' : 'Gerar relatório'}</button>
    </form>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {result && <><p className="text-xs text-slate-400">{result.data.note}</p><p className="text-sm">{result.data.rows.length} registro(s). Prévia de até 100 linhas.</p><button disabled={busy} className={panelButton} onClick={download}>Exportar CSV completo</button>
      <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{result.data.columns.map(column => <th className="whitespace-nowrap border-b border-slate-700 p-2" key={column}>{column}</th>)}</tr></thead><tbody>{result.data.rows.slice(0, 100).map((row, i) => <tr key={i}>{row.map((cell, j) => <td key={j} className="border-b border-slate-800 p-2">{cell ?? '—'}</td>)}</tr>)}</tbody></table></div></>}
  </section>;
}
