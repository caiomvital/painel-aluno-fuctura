'use client';

import { useEffect, useState } from 'react';
import { api, buttonClass } from './director-ui';

type Bid = { id: string; bidderName: string; amount: number; createdAt: string };

export function AuctionBidHistory({ itemId }: { itemId: string }) {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<{ bids: Bid[]; hasMore: boolean } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    api(`/api/director/auction/bids?itemId=${encodeURIComponent(itemId)}&page=${page}`, undefined, undefined, controller.signal)
      .then(setResult)
      .catch((err) => { if (err.name !== 'AbortError') setError(err.message); });
    return () => controller.abort();
  }, [open, itemId, page, retry]);
  function changePage(next: number) { setResult(null); setError(''); setPage(next); }
  function refresh() { setResult(null); setError(''); setPage(1); setRetry(retry + 1); }
  return (
    <section className="space-y-3">
      <button className={`${buttonClass} w-full`} aria-expanded={open} aria-controls={`bids-${itemId}`} onClick={() => { setResult(null); setError(''); setOpen(!open); }}>
        {open ? 'Ocultar lances' : 'Ver lances'}
      </button>
      {open && <div id={`bids-${itemId}`} className="space-y-3 text-xs">
        <h4 className="font-semibold text-slate-200">Histórico de lances • mais recentes primeiro</h4>
        {error ? <div role="alert">{error} <button className={buttonClass} onClick={refresh}>Tentar novamente</button></div>
          : !result ? <p role="status">Carregando lances…</p>
          : <>
            {result.bids.length === 0 ? <p className="text-slate-400">Nenhum lance nesta página.</p> : <ol className="space-y-2">
              {result.bids.map((bid) => <li key={bid.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3">
                <div className="flex justify-between gap-2"><span className="break-words min-w-0 text-slate-200">{bid.bidderName}</span><strong className="shrink-0 text-amber-400">{bid.amount.toLocaleString('pt-BR')} Coins</strong></div>
                <time dateTime={bid.createdAt} className="text-slate-400">{new Date(bid.createdAt).toLocaleString('pt-BR')}</time>
              </li>)}
            </ol>}
            <div className="flex items-center justify-between gap-2">
              <button className={buttonClass} disabled={page === 1} onClick={() => changePage(page - 1)}>Anterior</button>
              <span>Página {page}</span>
              <button className={buttonClass} disabled={!result.hasMore} onClick={() => changePage(page + 1)}>Próxima</button>
            </div>
            <button className={buttonClass} onClick={refresh}>Atualizar lances</button>
          </>}
      </div>}
    </section>
  );
}
