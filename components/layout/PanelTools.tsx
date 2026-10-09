'use client';
import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { PanelDialog } from './PanelDialog';
import { AccountSettings } from './AccountSettings';
import { TaskList } from './TaskList';
import { NotificationList } from './NotificationList';
import { DirectorSearch } from '../director/DirectorSearch';
import { AuditHistory } from '../director/AuditHistory';
import { DirectorReports } from '../director/DirectorReports';
import { panelApi, panelButton } from './panel-ui';
import { useUserPreferences } from './UserPreferences';
type Area = 'Pendências' | 'Notificações' | 'Minha conta' | 'Busca' | 'Histórico' | 'Relatórios';
export function PanelTools({ role }: { role: string }) {
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState<Area>('Pendências');
  const [unread, setUnread] = useState(0);
  const [version, setVersion] = useState(0);
  const { preferences } = useUserPreferences();
  useEffect(() => {
    const controller = new AbortController();
    const refresh = () => {
      if (!document.hidden) panelApi<{ unread: number }>('/api/notifications', { signal: controller.signal }).then(data => setUnread(data.unread)).catch(() => { /* Opening notifications exposes request failures and retry. */ });
    };
    refresh(); const interval = setInterval(refresh, 60000); window.addEventListener('focus', refresh);
    return () => { controller.abort(); clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, [preferences, version]);
  const areas: Area[] = ['Pendências', 'Notificações', 'Minha conta', ...(role === 'DIRETOR' ? ['Busca', 'Histórico', 'Relatórios'] as Area[] : [])];
  return <>
    <button title="Meu painel" aria-label={`Meu painel${unread ? `, ${unread} avisos não lidos` : ''}`} onClick={() => setOpen(true)} className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/80 p-2 text-xs text-slate-200"><Bell className="h-4 w-4" /><span className="hidden md:inline">Meu painel</span>{unread > 0 && <span className="rounded-full bg-cyan-500 px-1.5 text-slate-950">{unread > 99 ? '99+' : unread}</span>}</button>
    {open && <PanelDialog title="Meu painel" onClose={() => setOpen(false)}>
      <nav aria-label="Ferramentas do painel" className="mb-5 flex flex-wrap gap-2">{areas.map(option => <button key={option} aria-current={area === option ? 'page' : undefined} className={`${panelButton} ${area === option ? 'border-cyan-400' : ''}`} onClick={() => setArea(option)}>{option}</button>)}</nav>
      <h3 className="mb-3 text-base font-bold">{area}</h3>
      {area === 'Pendências' && <TaskList onNavigate={() => setOpen(false)} />}
      {area === 'Notificações' && <NotificationList onNavigate={() => setOpen(false)} onRead={() => setVersion(v => v + 1)} />}
      {area === 'Minha conta' && <AccountSettings />}
      {area === 'Busca' && role === 'DIRETOR' && <DirectorSearch onNavigate={() => setOpen(false)} />}
      {area === 'Histórico' && role === 'DIRETOR' && <AuditHistory />}
      {area === 'Relatórios' && role === 'DIRETOR' && <DirectorReports />}
    </PanelDialog>}
  </>;
}
