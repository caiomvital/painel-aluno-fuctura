'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { defaultPreferences, type Preferences } from '@/lib/panel-preferences';
import { panelApi } from './panel-ui';
type Context = { preferences: Preferences; ready: boolean; saving: boolean; error: string; save: (next: Preferences) => Promise<void> };
const PreferencesContext = createContext<Context | null>(null);
export function UserPreferences({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(defaultPreferences);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    panelApi<{ preferences: Preferences }>('/api/account', { signal: controller.signal }).then(data => { setPreferences(data.preferences); setReady(true); }).catch(e => { if (e.name !== 'AbortError') setError(e.message); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    document.documentElement.setAttribute('data-panel-color', preferences.color);
    document.documentElement.setAttribute('data-text-size', preferences.textSize);
    return () => { document.documentElement.removeAttribute('data-panel-color'); document.documentElement.removeAttribute('data-text-size'); };
  }, [preferences]);
  async function save(next: Preferences) {
    setSaving(true); setError('');
    try {
      const data = await panelApi<{ preferences: Preferences }>('/api/account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'PREFERENCES', preferences: next }) });
      setPreferences(data.preferences); setReady(true);
    } catch (e) { setError((e as Error).message); throw e; }
    finally { setSaving(false); }
  }
  return <PreferencesContext.Provider value={{ preferences, ready, saving, error, save }}>{children}</PreferencesContext.Provider>;
}
export function useUserPreferences() { const context = useContext(PreferencesContext); if (!context) throw new Error('Preferências indisponíveis.'); return context; }
