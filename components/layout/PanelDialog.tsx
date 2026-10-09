'use client';
import { useEffect, useRef } from 'react';
export function PanelDialog({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return <dialog ref={ref} aria-label={title} onCancel={onClose} className="m-auto max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 shadow-2xl backdrop:bg-black/70 sm:p-6">
    <div className="mb-5 flex items-center justify-between gap-3"><h2 className="text-lg font-bold">{title}</h2><button autoFocus onClick={onClose} className="rounded-lg border border-slate-700 px-3 py-2 text-sm">Fechar</button></div>
    {children}
  </dialog>;
}
