'use client';

import React, { useState } from 'react';
import {
  Trophy,
  Zap,
  Flame,
  Award,
  Star,
  CheckCircle2,
  Lock,
  Sparkles,
  TrendingUp,
  Gift,
  ArrowRight,
  Info,
  Medal,
} from 'lucide-react';

export interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  conditionRule: string;
  isEarned: boolean;
  earnedAt?: string | null;
}

interface GamificationSectionProps {
  currentXp: number;
  level: number;
  streak: number;
  rankingPosition: number;
  totalInClass: number;
  badges: BadgeItem[];
  onOpenAuction?: () => void;
}

export const GamificationSection: React.FC<GamificationSectionProps> = ({
  currentXp,
  level,
  streak,
  rankingPosition,
  totalInClass,
  badges,
  onOpenAuction,
}) => {
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [badgeFilter, setBadgeFilter] = useState<'all' | 'earned' | 'locked'>('all');

  // Level XP math (levels are 300 XP each)
  const currentLevelFloor = (level - 1) * 300;
  const nextLevelCeil = level * 300;
  const xpInCurrentLevel = Math.max(0, currentXp - currentLevelFloor);
  const xpNeededForNext = Math.max(0, nextLevelCeil - currentXp);
  const progressPercent = Math.min(100, Math.max(0, Math.round((xpInCurrentLevel / 300) * 100)));

  const earnedCount = badges.filter((b) => b.isEarned).length;
  const totalCount = badges.length;
  const badgesEarnedPercent = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  const getLevelTitle = (lvl: number) => {
    switch (lvl) {
      case 1:
        return 'Iniciante do Código';
      case 2:
        return 'Explorador Tech';
      case 3:
        return 'Desenvolvedor Júnior';
      case 4:
        return 'Desenvolvedor Pleno';
      case 5:
        return 'Arquiteto de Software';
      default:
        return `Especialista Nível ${lvl}`;
    }
  };

  const getBadgeVisual = (iconName: string, isEarned: boolean) => {
    if (!isEarned) {
      return {
        bg: 'from-slate-800 to-slate-900',
        border: 'border-slate-800',
        text: 'text-slate-500',
        icon: <Lock className="w-5 h-5 text-slate-500" />,
      };
    }

    switch (iconName) {
      case 'Flame':
        return {
          bg: 'from-amber-500/20 via-orange-500/10 to-amber-500/5',
          border: 'border-amber-500/40',
          text: 'text-amber-400',
          icon: <Flame className="w-6 h-6 text-amber-400 fill-amber-400 animate-pulse" />,
        };
      case 'CheckCircle':
        return {
          bg: 'from-emerald-500/20 via-teal-500/10 to-emerald-500/5',
          border: 'border-emerald-500/40',
          text: 'text-emerald-400',
          icon: <CheckCircle2 className="w-6 h-6 text-emerald-400 fill-emerald-400/20" />,
        };
      case 'Award':
        return {
          bg: 'from-indigo-500/20 via-purple-500/10 to-indigo-500/5',
          border: 'border-indigo-500/40',
          text: 'text-indigo-400',
          icon: <Award className="w-6 h-6 text-indigo-400" />,
        };
      case 'Sparkles':
      default:
        return {
          bg: 'from-cyan-500/20 via-blue-500/10 to-cyan-500/5',
          border: 'border-cyan-500/40',
          text: 'text-cyan-400',
          icon: <Sparkles className="w-6 h-6 text-cyan-400" />,
        };
    }
  };

  const filteredBadges = badges.filter((b) => {
    if (badgeFilter === 'earned') return b.isEarned;
    if (badgeFilter === 'locked') return !b.isEarned;
    return true;
  });

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 sm:p-7 backdrop-blur-md shadow-2xl relative overflow-hidden space-y-6">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 h-64 w-64 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 h-64 w-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      {/* 1. Header with Gamification Title and Quick Stats */}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-[11px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Gamificação Fuctura
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Nível, Progresso de XP &amp; Medalhas
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Ganhe pontos comparecendo às aulas, mantendo sequência e desbloqueando insígnias de honra.
          </p>
        </div>

        {/* Quick Highlights */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 font-mono text-base font-black text-amber-400">
              <Flame className="w-4 h-4 fill-amber-400" />
              <span>{streak} aulas</span>
            </div>
            <span className="text-[10px] text-amber-300/80 font-medium block">Sequência (Streak)</span>
          </div>

          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-2 text-center">
            <div className="flex items-center justify-center gap-1 font-mono text-base font-black text-cyan-400">
              <Trophy className="w-4 h-4" />
              <span>#{rankingPosition}</span>
            </div>
            <span className="text-[10px] text-cyan-300/80 font-medium block">de {totalInClass} alunos</span>
          </div>
        </div>
      </div>

      {/* 2. Visual XP Progress Bar Block */}
      <div className="relative z-10 rounded-2xl border border-cyan-500/20 bg-slate-950/70 p-5 sm:p-6 shadow-inner space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-[2px] shadow-lg shadow-cyan-500/20">
              <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-slate-950">
                <span className="font-mono text-lg font-black text-cyan-400">{level}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Nível {level}</span>
                <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2 py-0.5 rounded-full">
                  {getLevelTitle(level)}
                </span>
              </div>
              <span className="text-xs text-slate-400 mt-0.5 block">
                Próxima patente: <strong className="text-slate-300 font-medium">{getLevelTitle(level + 1)}</strong> (Nível {level + 1})
              </span>
            </div>
          </div>

          <div className="flex flex-col sm:items-end">
            <div className="flex items-center gap-1.5 font-mono text-xl sm:text-2xl font-black text-cyan-400">
              <Zap className="w-5 h-5 fill-cyan-400" />
              <span>{currentXp.toLocaleString('pt-BR')} XP</span>
            </div>
            <span className="text-[11px] text-slate-400">
              {currentXp} de {nextLevelCeil} XP acumulados
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Progresso rumo ao Nível {level + 1}</span>
            <span className="font-mono text-cyan-400 font-bold">{progressPercent}%</span>
          </div>
          <div className="h-4 w-full rounded-full bg-slate-900 border border-slate-800 p-0.5 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 shadow-md shadow-cyan-500/30 transition-all duration-1000 relative"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span>Início: {currentLevelFloor} XP</span>
            <span className="text-cyan-400 font-medium">
              Faltam apenas {xpNeededForNext} XP para subir de nível!
            </span>
            <span>Meta: {nextLevelCeil} XP</span>
          </div>
        </div>

        {/* Quick XP earning tips */}
        <div className="pt-2 border-t border-slate-900 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Presença em aula: <strong className="text-emerald-400 font-bold">+50 XP</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>Login diário: <strong className="text-cyan-400 font-bold">+5 XP</strong></span>
          </div>
          <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800/60">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>Ciclo de 7 presenças: <strong className="text-amber-400 font-bold">+200 XP</strong></span>
          </div>
        </div>
      </div>

      {/* 3. Medalhas & Conquistas Showcase */}
      <div className="relative z-10 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Medal className="w-4 h-4 text-amber-400" />
              <span>Medalhas Conquistadas ({earnedCount} de {totalCount})</span>
            </h3>
            <span className="text-xs text-slate-400">
              Você já desbloqueou {badgesEarnedPercent}% das insígnias do curso.
            </span>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-1 bg-slate-950/80 border border-slate-800 rounded-xl self-start sm:self-center">
            <button
              onClick={() => setBadgeFilter('all')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                badgeFilter === 'all'
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Todas ({totalCount})
            </button>
            <button
              onClick={() => setBadgeFilter('earned')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                badgeFilter === 'earned'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Conquistadas ({earnedCount})
            </button>
            <button
              onClick={() => setBadgeFilter('locked')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                badgeFilter === 'locked'
                  ? 'bg-slate-700 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              A Conquistar ({totalCount - earnedCount})
            </button>
          </div>
        </div>

        {/* Badges Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredBadges.map((badge) => {
            const visual = getBadgeVisual(badge.icon, badge.isEarned);

            return (
              <div
                key={badge.id}
                onClick={() => setSelectedBadge(badge)}
                className={`group flex items-start gap-3.5 rounded-2xl border p-4 transition-all cursor-pointer backdrop-blur-sm relative overflow-hidden ${
                  badge.isEarned
                    ? `border-slate-800 bg-gradient-to-br ${visual.bg} hover:border-slate-700 shadow-md`
                    : 'border-slate-800/50 bg-slate-950/40 opacity-70 hover:opacity-100 hover:border-slate-800'
                }`}
              >
                {/* Badge Icon Box */}
                <div
                  className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${visual.border} bg-slate-950/80 shadow-inner group-hover:scale-105 transition-transform`}
                >
                  {visual.icon}
                </div>

                {/* Badge Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <h4 className="text-xs font-bold text-white truncate">{badge.name}</h4>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md shrink-0 ${
                        badge.isEarned
                          ? 'text-cyan-300 bg-cyan-500/10 border border-cyan-500/20'
                          : 'text-slate-500 bg-slate-900 border border-slate-800'
                      }`}
                    >
                      +{badge.xpReward} XP
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {badge.description}
                  </p>

                  <div className="mt-2 flex items-center justify-between text-[10px]">
                    {badge.isEarned ? (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Conquistada
                      </span>
                    ) : (
                      <span className="text-slate-500 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Bloqueada
                      </span>
                    )}

                    {badge.earnedAt && (
                      <span className="text-slate-500 font-mono">
                        {new Date(badge.earnedAt).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Action Banner to visit Auction */}
      {onOpenAuction && (
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Participe do Leilão Fuctura!
              </span>
              <span className="text-[11px] text-slate-400">
                Use suas Coins conquistadas em aula para disputar prêmios e mentorias. Gastar Coins não reduz seu XP ou nível acadêmico!
              </span>
            </div>
          </div>

          <button
            onClick={onOpenAuction}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 px-4 py-2 text-xs font-bold text-slate-950 transition-all shadow-md shadow-amber-500/20 shrink-0"
          >
            <span>Ver Itens do Leilão</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 5. Modal for selected Badge */}
      {selectedBadge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-950 p-6 text-center shadow-2xl relative">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-cyan-500/30 bg-cyan-500/10 mb-4">
              {getBadgeVisual(selectedBadge.icon, selectedBadge.isEarned).icon}
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-1">
              {selectedBadge.isEarned ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Insígnia Conquistada
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500">
                  <Lock className="w-3.5 h-3.5" /> Insígnia a Desbloquear
                </span>
              )}
            </div>

            <h3 className="text-lg font-bold text-white">{selectedBadge.name}</h3>
            <p className="text-xs text-slate-300 mt-2 leading-relaxed">{selectedBadge.description}</p>

            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs space-y-1 text-left">
              <div className="flex items-center justify-between text-slate-400">
                <span>Recompensa de XP:</span>
                <span className="font-mono font-bold text-cyan-400">+{selectedBadge.xpReward} XP</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Critério:</span>
                <span className="text-slate-200 font-medium">{selectedBadge.conditionRule}</span>
              </div>
              {selectedBadge.earnedAt && (
                <div className="flex items-center justify-between text-slate-400">
                  <span>Conquistada em:</span>
                  <span className="font-mono text-slate-200">
                    {new Date(selectedBadge.earnedAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedBadge(null)}
              className="mt-5 w-full rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-semibold text-white transition-colors"
            >
              Fechar Detalhes
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
