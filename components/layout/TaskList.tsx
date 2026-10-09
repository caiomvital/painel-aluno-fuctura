'use client';
import { useEffect, useState } from 'react';
import { panelApi, panelButton } from './panel-ui';
import { navigatePanel } from '@/lib/panel-navigation';
type Tasks = { total: number; tasks: { id: string; title: string; detail: string; target: string; classId?: string }[] };
export function TaskList({ onNavigate }: { onNavigate?: () => void }) {
  const [data, setData] = useState<Tasks | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    panelApi<Tasks>('/api/tasks', { signal: controller.signal }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, []);
  async function refresh() { setError(''); try { setData(await panelApi<Tasks>('/api/tasks')); } catch (e) { setError((e as Error).message); } }
  return <section aria-label="Pendências e próximos passos" className="space-y-3">
    <div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Pendências e próximos passos{data ? ` (${data.total})` : ''}</h3><button className={panelButton} onClick={refresh}>Atualizar pendências</button></div>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {!data && !error && <p role="status">Carregando pendências…</p>}
    {data?.total === 0 && <p className="text-sm text-slate-400">Nenhuma pendência ou próxima aula encontrada.</p>}
    {data?.tasks.map(task => <article key={`${task.target}:${task.id}`} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800 p-3">
      <div className="min-w-0"><h4 className="text-sm font-semibold">{task.title}</h4><p className="break-words text-sm text-slate-400">{task.detail}</p></div>
      <button className={panelButton} onClick={() => { navigatePanel({ target: task.target, id: task.id, classId: task.classId }); onNavigate?.(); }}>Abrir</button>
    </article>)}
    {data && data.total > data.tasks.length && <p className="text-xs text-slate-400">Mostrando as pendências mais antigas e próximos passos. Abra a área correspondente para consultar todos.</p>}
  </section>;
}
