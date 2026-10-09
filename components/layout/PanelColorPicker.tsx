'use client';

import { useState } from 'react';
import { useUserPreferences } from './UserPreferences';
import { Palette } from 'lucide-react';

const colors = [
  { id: 'default', label: 'Padrão', swatch: '#64748b' },
  { id: 'blue', label: 'Azul', swatch: '#3b82f6' },
  { id: 'green', label: 'Verde', swatch: '#10b981' },
  { id: 'violet', label: 'Violeta', swatch: '#8b5cf6' },
] as const;

export function PanelColorPicker() {
  const { preferences, ready, saving, error, save } = useUserPreferences();
  const color = preferences.color;
  const [open, setOpen] = useState(false);
  async function choose(value: typeof color) {
    try { await save({ ...preferences, color: value }); } catch { /* error is shown below */ }
  }
  return <div className="relative">
    <button type="button" aria-label="Mudar cor do painel" title="Mudar cor do painel" aria-expanded={open} aria-controls="panel-colors" onClick={() => setOpen(!open)} className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/80 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white">
      <Palette className="h-4 w-4" /><span className="hidden md:inline">Cor do painel</span>
    </button>
    {open && <div id="panel-colors" className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-700 bg-slate-950 p-3 shadow-xl" onKeyDown={(event) => { if (event.key === 'Escape') setOpen(false); }}>
      <p className="mb-2 text-xs font-semibold text-slate-200">Cor do painel</p>
      <div className="grid grid-cols-2 gap-2">
        {colors.map((option) => <button type="button" key={option.id} disabled={!ready || saving} aria-pressed={color === option.id} onClick={() => choose(option.id)} className={`flex items-center gap-2 rounded-lg border px-2 py-2 text-xs text-slate-200 ${color === option.id ? 'border-cyan-400' : 'border-slate-700'}`}>
          <span className="h-3 w-3 rounded-full" style={{ backgroundColor: option.swatch }} />{option.label}
        </button>)}
      </div>
      <p role="status" className="mt-2 text-xs text-slate-400">{error || (saving ? 'Salvando…' : 'Preferência salva na sua conta.')}</p>
      <button className="mt-2 text-xs text-slate-300 underline" onClick={() => setOpen(false)}>Fechar</button>
    </div>}
  </div>;
}
