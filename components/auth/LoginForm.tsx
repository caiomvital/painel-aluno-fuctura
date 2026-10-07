'use client';

import React, { useState } from 'react';
import { Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginFormProps {
  onSuccess: (user: any) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Credenciais inválidas.');
      }

      onSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 sm:p-8 backdrop-blur-xl shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 via-blue-600 to-indigo-600 p-[2px] shadow-lg shadow-cyan-500/20 mb-4">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
              <span className="font-mono text-3xl font-black text-cyan-400">F</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Painel Fuctura</h1>
          <p className="mt-1 text-xs text-slate-400">
            Acesse com seu e-mail institucional para entrar no seu ambiente
          </p>
        </div>

        {error && (
          <div className="mb-6 flex items-start gap-2.5 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">E-mail Institucional</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Mail className="h-4 w-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu.email@fuctura.com.br"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-300">Senha de Acesso</label>
              <span className="text-[11px] text-slate-500">Suporte pedagógico</span>
            </div>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-500">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full rounded-2xl border border-slate-800 bg-slate-950/80 py-3 pl-10 pr-3 text-sm text-slate-100 placeholder:text-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 transition-all active:scale-[0.99]"
          >
            {loading ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <span>Entrar no Sistema</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 space-y-2.5">
          <span className="text-[11px] font-semibold text-slate-400 block text-center">
            Acesso Rápido para Demonstração &amp; Testes:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail('diretor@fuctura.com.br');
                setPassword('Password123!');
              }}
              className="rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 py-2 px-1 text-[11px] font-bold text-amber-300 text-center transition-all"
            >
              👑 Diretor
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('henrique.silveira@fuctura.com.br');
                setPassword('Password123!');
              }}
              className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 py-2 px-1 text-[11px] font-bold text-cyan-300 text-center transition-all"
            >
              👨‍🏫 Professor
            </button>
            <button
              type="button"
              onClick={() => {
                setEmail('aluno@fuctura.com.br');
                setPassword('Password123!');
              }}
              className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 py-2 px-1 text-[11px] font-bold text-emerald-300 text-center transition-all"
            >
              🎓 Aluno
            </button>
          </div>
        </div>

        <div className="mt-4 text-center text-[10px] text-slate-500">
          O sistema identifica automaticamente o perfil de <span className="text-slate-400 font-medium">Aluno</span>, <span className="text-slate-400 font-medium">Professor</span> ou <span className="text-slate-400 font-medium">Diretor</span>.
        </div>
      </div>
    </div>
  );
};
