'use client';
import { useState } from 'react';
import { useUserPreferences } from './UserPreferences';
import { panelApi, panelButton, panelField } from './panel-ui';
export function AccountSettings() {
  const { preferences, ready, saving, error, save } = useUserPreferences();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  async function update(next: typeof preferences) { setMessage(''); try { await save(next); setMessage('Preferências salvas.'); } catch { /* context displays failure */ } }
  async function passwordSubmit(event: React.FormEvent) {
    event.preventDefault(); setPasswordBusy(true); setPasswordError(''); setMessage('');
    try {
      const data = await panelApi<{ message: string }>('/api/account', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'PASSWORD', currentPassword, newPassword, confirmPassword }) });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage(data.message);
    } catch (e) { setPasswordError((e as Error).message); } finally { setPasswordBusy(false); }
  }
  return <div className="space-y-6">
    {error && <p role="alert" className="text-rose-300">{error}</p>}
    {message && <p role="status" className="text-emerald-300">{message}</p>}
    <fieldset disabled={!ready || saving} className="space-y-3">
      <legend className="mb-2 font-semibold">Aparência</legend>
      <label className="block text-sm">Cor do painel<select className={panelField} value={preferences.color} onChange={e => update({ ...preferences, color: e.target.value as typeof preferences.color })}><option value="default">Padrão</option><option value="blue">Azul</option><option value="green">Verde</option><option value="violet">Violeta</option></select></label>
      <label className="block text-sm">Tamanho do texto<select className={panelField} value={preferences.textSize} onChange={e => update({ ...preferences, textSize: e.target.value as typeof preferences.textSize })}><option value="normal">Normal</option><option value="large">Grande</option><option value="larger">Muito grande</option></select></label>
      <p className="text-xs text-slate-400">As preferências acompanham sua conta em outros dispositivos.</p>
    </fieldset>
    <fieldset disabled={!ready || saving} className="space-y-3">
      <legend className="mb-2 font-semibold">Avisos dentro do painel</legend>
      {([['ACCOUNT', 'Cadastro e conta'], ['ACADEMIC', 'Aulas e presenças'], ['AUCTION', 'Leilões e lances']] as const).map(([key, label]) => <label key={key} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={preferences.notifications[key]} onChange={e => update({ ...preferences, notifications: { ...preferences.notifications, [key]: e.target.checked } })} />{label}</label>)}
    </fieldset>
    <form onSubmit={passwordSubmit} className="space-y-3 border-t border-slate-800 pt-4">
      <h3 className="font-semibold">Trocar senha</h3><p className="text-sm text-slate-400">Informe sua senha atual. A troca encerra as outras sessões, sem envio de e-mail.</p>
      <label className="block text-sm">Senha atual<input className={panelField} type="password" autoComplete="current-password" required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} /></label>
      <label className="block text-sm">Nova senha<input className={panelField} type="password" autoComplete="new-password" required minLength={12} value={newPassword} onChange={e => setNewPassword(e.target.value)} /></label>
      <p className="text-xs text-slate-400">Pelo menos 12 caracteres; até 72 bytes. Caracteres acentuados podem ocupar mais de um byte.</p>
      <label className="block text-sm">Confirmar nova senha<input className={panelField} type="password" autoComplete="new-password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} /></label>
      {passwordError && <p role="alert" className="text-rose-300">{passwordError}</p>}
      <button className={panelButton} disabled={passwordBusy}>{passwordBusy ? 'Alterando…' : 'Alterar senha'}</button>
    </form>
  </div>;
}
