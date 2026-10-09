'use client';
import { useEffect, useState } from 'react';
import { panelApi, panelButton } from './panel-ui';
import { navigatePanel } from '@/lib/panel-navigation';
type Notice = { id: string; title: string; message: string; target: string; readAt: string | null; createdAt: string };
type Feed = { notifications: Notice[]; unread: number; hasMore: boolean };
export function NotificationList({ onNavigate, onRead }: { onNavigate: () => void; onRead: () => void }) {
  const [data, setData] = useState<Feed | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    panelApi<Feed>(`/api/notifications?page=${page}`, { signal: controller.signal }).then(setData).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, [page, retry]);
  function refresh() { setError(''); setData(null); setRetry(retry + 1); onRead(); }
  async function read(notice: Notice, navigate = false) {
    setBusy(notice.id); setError('');
    try {
      if (!notice.readAt) await panelApi('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: notice.id }) });
      setData(await panelApi<Feed>(`/api/notifications?page=${page}`)); onRead();
      if (navigate) { navigatePanel({ target: notice.target }); onNavigate(); }
    } catch (e) { setError((e as Error).message); } finally { setBusy(''); }
  }
  return <section className="space-y-3">
    <div className="flex items-center justify-between gap-2"><p className="text-sm">{data ? `${data.unread} aviso(s) não lido(s)` : 'Seus avisos'} </p><button className={panelButton} onClick={refresh}>Atualizar avisos</button></div>
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {!data && !error && <p role="status">Carregando avisos…</p>}
    {data?.notifications.length === 0 && <p className="text-sm text-slate-400">Nenhum aviso encontrado nas categorias habilitadas em Minha conta.</p>}
    {data?.notifications.map(notice => <article key={notice.id} className={`rounded-xl border p-3 ${notice.readAt ? 'border-slate-800' : 'border-cyan-500/40 bg-cyan-500/5'}`}>
      <h3 className="font-semibold">{notice.title}{!notice.readAt && <span className="ml-2 text-xs text-cyan-300">Novo</span>}</h3>
      <p className="mt-1 break-words text-sm text-slate-300">{notice.message}</p><time className="text-xs text-slate-400" dateTime={notice.createdAt}>{new Date(notice.createdAt).toLocaleString('pt-BR')}</time>
      <div className="mt-3 flex flex-wrap gap-2"><button disabled={!!busy} className={panelButton} onClick={() => read(notice, true)}>Abrir aviso</button>{!notice.readAt && <button disabled={!!busy} className={panelButton} onClick={() => read(notice)}>Marcar como lido</button>}</div>
    </article>)}
    {data && <div className="flex items-center justify-between gap-2"><button disabled={page === 1} className={panelButton} onClick={() => { setData(null); setError(''); setPage(page - 1); }}>Anterior</button><span className="text-sm">Página {page}</span><button disabled={!data.hasMore} className={panelButton} onClick={() => { setData(null); setError(''); setPage(page + 1); }}>Próxima</button></div>}
  </section>;
}
