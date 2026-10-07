'use client';

import React, { useState, useEffect } from 'react';
import {
  Flame,
  Zap,
  Trophy,
  Calendar,
  Clock,
  BookOpen,
  CheckCircle2,
  Clock3,
  Award,
  Sparkles,
  ChevronRight,
  AlertTriangle,
  History,
  Check,
  FileText,
  Download,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Medal,
  Star,
  Compass,
  Gavel,
  School,
} from 'lucide-react';
import { AuctionSection, AuctionItem } from '@/components/auction/AuctionSection';
import { GamificationSection } from '@/components/student/GamificationSection';
import { HeroAuctionFlashcard } from '@/components/auction/HeroAuctionFlashcard';

export const DEFAULT_STUDENT_DASHBOARD_MOCK = {
  student: {
    id: 'stud_1',
    name: 'João Pedro da Silva',
    email: 'aluno@fuctura.com.br',
    registrationNumber: 'FUC-2026-0891',
    currentXp: 1240,
    level: 4,
    streak: 7,
    rankingPosition: 4,
    totalInClass: 15,
    attendanceRate: 100,
    coinBalance: 1240,
    reservedCoins: 0,
    availableCoins: 1240,
  },
  course: {
    id: 'course_1',
    name: 'Academia Java Full Stack',
    code: 'JAVA-FS',
    workloadHours: 96,
  },
  classInfo: {
    id: 'class_1',
    name: 'Java Fullstack - Turma Sábado',
    code: 'JAVA-SAB-2026.1',
    daysOfWeek: 'SAB',
    scheduleTime: '08:30 - 12:30',
    lessonsPerWeek: 1,
    teacherName: 'Prof. Henrique Silveira',
  },
  progress: {
    progressPercent: 44,
    completedLessonsCount: 7,
    totalLessonsCount: 16,
  },
  lastLesson: {
    id: 'les_j7',
    lessonNumber: 7,
    title: 'Aprofundamento em POO: Encapsulamento Avançado',
    date: '2026-03-21T00:00:00.000Z',
    scheduleTime: '08:30 - 12:30',
    plannedContent: 'Encapsulamento avançado, imutabilidade, records e boas práticas de modelagem.',
    actualContent: 'Prática guiada de orientação a objetos avançada e imutabilidade no Java 21.',
    materials: 'Slides Módulo 7 & Repositório GitHub Fuctura',
    activities: 'Exercício de fixação entregue no prazo',
  },
  nextLesson: {
    id: 'les_j8',
    lessonNumber: 8,
    title: 'Herança, Polimorfismo & Classes Abstratas',
    date: '2026-03-28T00:00:00.000Z',
    scheduleTime: '08:30 - 12:30',
    plannedContent: 'Herança simples em Java, palavra-chave super, polimorfismo dinâmico e contratos abstratos.',
    materials: 'Material preparatório Módulo 8',
    activities: 'Projeto prático: Sistema de Folha de Pagamento',
    attendanceStatus: null,
    canRequestAttendance: true,
  },
  missedLessons: [],
  ranking: [
    { id: 'stud_2', name: 'Maria Eduarda Santos', xp: 1450, position: 1, isCurrentUser: false },
    { id: 'stud_3', name: 'Lucas Albuquerque', xp: 1380, position: 2, isCurrentUser: false },
    { id: 'stud_4', name: 'Beatriz Costa', xp: 1290, position: 3, isCurrentUser: false },
    { id: 'stud_1', name: 'João Pedro da Silva', xp: 1240, position: 4, isCurrentUser: true },
    { id: 'stud_5', name: 'Gabriel Martins', xp: 1100, position: 5, isCurrentUser: false },
    { id: 'stud_6', name: 'Camila Fernandes', xp: 950, position: 6, isCurrentUser: false },
  ],
  badges: [
    { id: 'bdg_1', name: 'Primeiro Acesso', description: 'Realizou o primeiro login no Portal do Aluno Fuctura', icon: 'Sparkles', xpReward: 50, conditionRule: 'Acessar o portal pela 1ª vez', isEarned: true, earnedAt: '2026-02-07T08:00:00.000Z' },
    { id: 'bdg_2', name: 'Primeira Presença', description: 'Primeira presença confirmada em sala de aula', icon: 'CheckCircle', xpReward: 100, conditionRule: '1 presença confirmada', isEarned: true, earnedAt: '2026-02-07T12:30:00.000Z' },
    { id: 'bdg_3', name: 'Foco Total (7 Aulas)', description: 'Manteve 7 presenças consecutivas sem nenhuma falta', icon: 'Flame', xpReward: 200, conditionRule: 'Streak de 7 aulas', isEarned: true, earnedAt: '2026-03-21T12:30:00.000Z' },
    { id: 'bdg_4', name: 'Mestre da Frequência', description: '100% de frequência no encerramento do primeiro módulo', icon: 'Award', xpReward: 300, conditionRule: '100% de presença no módulo', isEarned: false, earnedAt: null },
  ],
  recentTransactions: [
    { id: 'pt_1', amount: 50, type: 'ATTENDANCE', description: 'XP por presença confirmada (Aula 7)', originReference: 'ATTENDANCE_les_j7', createdAt: '2026-03-21T12:30:00.000Z' },
    { id: 'pt_2', amount: 5, type: 'LOGIN', description: 'XP por Login Diário', originReference: 'DAILY_LOGIN_2026-03-21', createdAt: '2026-03-21T08:15:00.000Z' },
    { id: 'pt_3', amount: 200, type: 'BADGE', description: 'Insígnia desbloqueada: Foco Total (7 Aulas)', originReference: 'BADGE_bdg_3', createdAt: '2026-03-21T12:31:00.000Z' },
    { id: 'pt_4', amount: 50, type: 'ATTENDANCE', description: 'XP por presença confirmada (Aula 6)', originReference: 'ATTENDANCE_les_j6', createdAt: '2026-03-14T12:30:00.000Z' },
    { id: 'pt_5', amount: 5, type: 'LOGIN', description: 'XP por Login Diário', originReference: 'DAILY_LOGIN_2026-03-14', createdAt: '2026-03-14T08:10:00.000Z' },
  ],
  lessons: [],
};

export const StudentView: React.FC = () => {
  const [data, setData] = useState<any>(DEFAULT_STUDENT_DASHBOARD_MOCK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'auction' | 'lessons' | 'ranking' | 'badges'>('overview');
  const [requestingAttendance, setRequestingAttendance] = useState(false);
  const [attendanceSuccessMsg, setAttendanceSuccessMsg] = useState<string | null>(null);
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);
  const [studentBalance, setStudentBalance] = useState<number>(1240);
  const [directBidItem, setDirectBidItem] = useState<AuctionItem | null>(null);

  const handleOpenFlashcardBid = (item: AuctionItem) => {
    setActiveTab('auction');
    setDirectBidItem(item);
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/student/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.student?.availableCoins !== undefined) {
          setStudentBalance(json.student.availableCoins);
        } else if (json.student?.coinBalance !== undefined) {
          setStudentBalance(json.student.coinBalance);
        }
      } else {
        setData(DEFAULT_STUDENT_DASHBOARD_MOCK);
      }
      setError(null);
    } catch {
      setData(DEFAULT_STUDENT_DASHBOARD_MOCK);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/student/dashboard')
      .then((res) => (res.ok ? res.json() : DEFAULT_STUDENT_DASHBOARD_MOCK))
      .then((json) => {
        if (isMounted && json) {
          setData(json);
          if (json.student?.availableCoins !== undefined) {
            setStudentBalance(json.student.availableCoins);
          } else if (json.student?.coinBalance !== undefined) {
            setStudentBalance(json.student.coinBalance);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(DEFAULT_STUDENT_DASHBOARD_MOCK);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleMarkAttendance = async (lessonId: string) => {
    setRequestingAttendance(true);
    setAttendanceSuccessMsg(null);
    try {
      const res = await fetch('/api/student/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Erro ao marcar presença.');
      }
      setAttendanceSuccessMsg('Sua presença foi registrada como PENDENTE. O professor validará em sala.');
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Erro ao solicitar presença.');
    } finally {
      setRequestingAttendance(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs text-slate-400">Carregando painel do aluno...</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-xl p-6 text-center">
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-300">
          <p className="text-sm font-semibold">{error || 'Não foi possível carregar os dados.'}</p>
          <button
            onClick={fetchDashboard}
            className="mt-4 rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-white hover:bg-slate-700"
          >
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const {
    student = {},
    course,
    classInfo,
    progress,
    lastLesson,
    nextLesson,
    missedLessons = [],
    ranking = [],
    badges = [],
    recentTransactions = [],
    lessons = [],
  } = data;

  const coinBalance = student.coinBalance ?? studentBalance ?? 0;
  const reservedCoins = student.reservedCoins ?? 0;
  const availableCoins = student.availableCoins ?? Math.max(0, coinBalance - reservedCoins);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  // Calculate XP needed for next level
  const currentLevelXpStart = (student.level - 1) * 300;
  const nextLevelXp = student.level * 300;
  const levelProgressXp = student.currentXp - currentLevelXpStart;
  const levelProgressPercent = Math.min(100, Math.round((levelProgressXp / 300) * 100));

  const getBadgeIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame':
        return <Flame className="w-5 h-5 text-amber-400" />;
      case 'CheckCircle':
        return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      case 'Award':
        return <Award className="w-5 h-5 text-indigo-400" />;
      case 'Sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-cyan-400" />;
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* 1. Hero Greeting & Gamification Bar */}
      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-[#0c1427] p-5 sm:p-7 shadow-2xl relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-0 right-0 h-48 w-48 bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Portal do Aluno</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs text-slate-300 font-semibold">Fuctura Tecnologia &bull; Escola de Informática</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-[11px] text-cyan-400/80 font-mono">Recife - PE &bull; Espinheiro</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">
              Olá, {student.name.split(' ')[0]}.
            </h1>

            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2">
              <span className="text-cyan-300 font-bold">{course?.name}</span>
              <span>&bull;</span>
              <span>Turma: <strong className="text-slate-200 font-normal">{classInfo?.name}</strong></span>
            </div>

            {/* Level XP Bar */}
            <div className="mt-4 max-w-md">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  Nível {student.level}
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {student.currentXp} / {nextLevelXp} XP ({levelProgressPercent}%)
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-800/90 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 transition-all duration-700"
                  style={{ width: `${levelProgressPercent}%` }}
                />
              </div>
            </div>

            {/* Gamification Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-4">
              {/* Streak */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 sm:px-4 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Flame className="w-4 h-4 fill-amber-400 animate-bounce" />
                  <span className="font-mono text-lg sm:text-xl font-black">{student.streak}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">aulas seguidas</span>
              </div>

              {/* Total XP */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 sm:px-4 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <Zap className="w-4 h-4 fill-cyan-400" />
                  <span className="font-mono text-lg sm:text-xl font-black">{student.currentXp.toLocaleString('pt-BR')}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">pontos XP</span>
              </div>

              {/* Saldo de Coins */}
              <button
                onClick={() => setActiveTab('auction')}
                className="flex flex-col items-center justify-center rounded-2xl border border-amber-500/40 bg-gradient-to-b from-amber-500/20 via-amber-950/30 to-slate-900/60 p-3 sm:px-4 text-center backdrop-blur-sm hover:border-amber-400 transition-all group relative overflow-hidden shadow-lg shadow-amber-500/10 cursor-pointer"
                title="Ver saldo e itens no leilão"
              >
                <div className="absolute top-1 right-1.5">
                  <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
                </div>
                <div className="flex items-center gap-1.5 text-amber-400 group-hover:scale-105 transition-transform">
                  <Gavel className="w-4 h-4" />
                  <span className="font-mono text-lg sm:text-xl font-black">{availableCoins.toLocaleString('pt-BR')}</span>
                </div>
                <span className="text-[10px] font-bold text-amber-300 mt-0.5 flex items-center gap-1">
                  Coins
                </span>
              </button>

              {/* Ranking */}
              <div className="flex flex-col items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 sm:px-4 text-center backdrop-blur-sm">
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <Trophy className="w-4 h-4" />
                  <span className="font-mono text-lg sm:text-xl font-black">#{student.rankingPosition}</span>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 mt-0.5">na turma</span>
              </div>
            </div>
          </div>

          {/* Flashcard Interativo do Leilão - Lado Direito do Hero */}
          <div className="w-full lg:w-auto shrink-0 flex justify-center">
            <HeroAuctionFlashcard
              userBalance={availableCoins}
              onOpenBidItem={handleOpenFlashcardBid}
            />
          </div>
        </div>
      </div>

      {attendanceSuccessMsg && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-medium">{attendanceSuccessMsg}</span>
        </div>
      )}

      {/* 2. Interactive Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Visão Geral</span>
        </button>

        <button
          onClick={() => setActiveTab('auction')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'auction'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black'
              : 'bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 hover:text-amber-200'
          }`}
        >
          <Gavel className="w-3.5 h-3.5 text-amber-400" />
          <span>Itens do Leilão 🔥</span>
          <span className="flex h-1.5 w-1.5 rounded-full bg-amber-400 animate-ping" />
        </button>

        <button
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'lessons'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Aulas &amp; Cronograma</span>
        </button>

        <button
          onClick={() => setActiveTab('ranking')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'ranking'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Ranking da Turma</span>
        </button>

        <button
          onClick={() => setActiveTab('badges')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'badges'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Trophy className="w-3.5 h-3.5" />
          <span>Gamificação &amp; Medalhas ({badges.filter((b: any) => b.isEarned).length})</span>
        </button>
      </div>

      {/* TAB CONTENT 1: VISÃO GERAL (DASHBOARD RESUMIDO) */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Dual Cards: Próxima Aula (O Que Vem Depois) vs Última Aula (O Que Vimos) */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* PRÓXIMA AULA - ALTA PRIORIDADE */}
            <div className="flex flex-col justify-between rounded-3xl border border-cyan-500/30 bg-slate-900/70 p-6 backdrop-blur-md relative overflow-hidden shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-cyan-400 animate-ping" />
                    <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Próxima Aula</span>
                  </div>
                  {classInfo && (
                    <span className="text-xs font-medium text-slate-300 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700/60">
                      {classInfo.daysOfWeek} &bull; {classInfo.scheduleTime}
                    </span>
                  )}
                </div>

                {nextLesson ? (
                  <>
                    <h3 className="text-xl font-bold text-white leading-snug">
                      Aula {nextLesson.lessonNumber}: {nextLesson.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        {formatDate(nextLesson.date)}
                      </span>
                      <span>&bull;</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-cyan-400" />
                        {nextLesson.scheduleTime}
                      </span>
                      <span>&bull;</span>
                      <span>Prof. {classInfo?.teacherName}</span>
                    </div>

                    {/* O QUE VEM DEPOIS */}
                    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                          O Que Vem Depois
                        </span>
                        <span className="text-[10px] text-slate-500">Conteúdo Previsto</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-normal">
                        {nextLesson.plannedContent}
                      </p>
                      {nextLesson.activities && (
                        <div className="mt-2.5 pt-2 border-t border-slate-900 text-[11px] text-slate-400 flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>Atividade prevista: {nextLesson.activities}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 py-6">Nenhuma aula futura agendada no momento.</p>
                )}
              </div>

              {/* Attendance Check-in Button */}
              {nextLesson && (
                <div className="mt-6 pt-4 border-t border-slate-800/80">
                  {nextLesson.attendanceStatus === 'PRESENT' ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 py-3 text-xs font-bold text-emerald-400 shadow-sm">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sua presença já foi confirmada pelo professor!</span>
                    </div>
                  ) : nextLesson.attendanceStatus === 'PENDING' ? (
                    <div className="flex items-center justify-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 py-3 text-xs font-bold text-amber-300 shadow-sm">
                      <Clock3 className="w-4 h-4 animate-spin" />
                      <span>Presença Marcada &bull; Aguardando validação do professor em sala</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkAttendance(nextLesson.id)}
                      disabled={requestingAttendance}
                      className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 py-3 text-xs font-bold text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-400 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50"
                    >
                      {requestingAttendance ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Marcar Minha Presença na Aula</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ÚLTIMA AULA REALIZADA */}
            <div className="flex flex-col justify-between rounded-3xl border border-slate-800/80 bg-slate-900/70 p-6 backdrop-blur-md shadow-xl">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-black uppercase tracking-wider text-slate-400">Última Aula Realizada</span>
                  <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-lg">
                    Concluída
                  </span>
                </div>

                {lastLesson ? (
                  <>
                    <h3 className="text-xl font-bold text-white leading-snug">
                      Aula {lastLesson.lessonNumber}: {lastLesson.title}
                    </h3>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                      <span>{formatDate(lastLesson.date)}</span>
                      <span>&bull;</span>
                      <span>{lastLesson.scheduleTime}</span>
                      <span>&bull;</span>
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Presença confirmada
                      </span>
                    </div>

                    {/* O QUE VIMOS */}
                    <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-950/80 p-4">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">
                          O Que Vimos
                        </span>
                        <span className="text-[10px] text-slate-500">Conteúdo Ministrado</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed font-normal">
                        {lastLesson.actualContent || lastLesson.plannedContent}
                      </p>

                      {lastLesson.materials && (
                        <div className="mt-3 pt-2.5 border-t border-slate-900 text-xs">
                          <span className="text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Material da aula: <strong className="text-slate-300 font-normal">{lastLesson.materials}</strong></span>
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-400 py-6">Ainda não houve aula ministrada.</p>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Frequência da turma:</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">{student.attendanceRate}% presenças</span>
              </div>
            </div>
          </div>

          {/* RESUMO DE COINS (SEÇÃO 6 & 7) */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-slate-900/80 to-slate-950 p-6 sm:p-7 backdrop-blur-md shadow-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
              <div className="max-w-xl">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    <Gavel className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                    Coins no Leilão Fuctura
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Seu Poder de Lance na Temporada
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                  Você ganha Coins junto com suas atividades acadêmicas e pode usá-las no Leilão Fuctura. Gastar Coins não reduz seu XP, nível ou posição no ranking.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('auction')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 px-6 py-3 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/20 transition-all active:scale-95 shrink-0"
              >
                <Gavel className="w-4 h-4" />
                <span>Ver Itens do Leilão</span>
              </button>
            </div>

            {/* Grid 3 Valores: Total, Em lances, Disponíveis */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-5 pt-5 border-t border-amber-500/20">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-center">
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                  Saldo Total
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-slate-200 mt-1 block">
                  {coinBalance.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-slate-500 mt-0.5 block">acumulado em aulas</span>
              </div>

              <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 text-center">
                <span className="text-[11px] font-semibold text-amber-300/80 uppercase tracking-wider block">
                  Em Lances Ativos
                </span>
                <span className="font-mono text-xl sm:text-2xl font-black text-amber-300 mt-1 block">
                  {reservedCoins.toLocaleString('pt-BR')}
                </span>
                <span className="text-[10px] text-amber-400/60 mt-0.5 block">reservado em disputas</span>
              </div>

              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-center shadow-inner">
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Disponível para Lances
                </span>
                <div className="flex items-center justify-center gap-1.5 mt-1">
                  <Zap className="w-5 h-5 fill-emerald-400 text-emerald-400" />
                  <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                    {availableCoins.toLocaleString('pt-BR')}
                  </span>
                </div>
                <span className="text-[10px] text-emerald-300/70 mt-0.5 block">livre para novos lances</span>
              </div>
            </div>
          </div>

          {/* RESUMO DE PROGRESSO ACADÊMICO & CONQUISTAS */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 pb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Seu Desempenho Acadêmico</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('ranking')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Ver Ranking da Turma</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <span className="text-slate-600">&bull;</span>
                <button
                  onClick={() => setActiveTab('badges')}
                  className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                >
                  <span>Ver Medalhas</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <span className="text-xs text-slate-400 block">Classificação</span>
                <span className="text-lg font-black text-emerald-400 font-mono mt-1 block">
                  #{student.rankingPosition} Lugar
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  entre os {student.totalInClass} alunos da turma
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <span className="text-xs text-slate-400 block">Frequência &amp; Sequência</span>
                <span className="text-lg font-black text-amber-400 font-mono mt-1 flex items-center gap-1">
                  <Flame className="w-4 h-4 fill-amber-400" />
                  {student.streak} aulas seguidas
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  {student.attendanceRate}% de presença geral
                </span>
              </div>

              <div className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <span className="text-xs text-slate-400 block">Insígnias Conquistadas</span>
                <span className="text-lg font-black text-cyan-400 font-mono mt-1 flex items-center gap-1">
                  <Award className="w-4 h-4" />
                  {badges.filter((b: any) => b.isEarned).length} de {badges.length}
                </span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">
                  insígnias de honra desbloqueadas
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: LEILÃO COMPLETO */}
      {activeTab === 'auction' && (
        <AuctionSection
          userRole="ALUNO"
          userName={student.name ? student.name.split(' ')[0] : 'Você'}
          userBalance={availableCoins}
          coinBalance={coinBalance}
          reservedCoins={reservedCoins}
          availableCoins={availableCoins}
          onBidSuccess={(b) => {
            setStudentBalance(b);
            fetchDashboard();
          }}
          externalOpenItem={directBidItem}
          onResetExternalOpenItem={() => setDirectBidItem(null)}
        />
      )}

      {/* TAB CONTENT 2: AULAS & CRONOGRAMA */}
      {activeTab === 'lessons' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <span>Cronograma de Aulas &bull; {classInfo?.name}</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Histórico e próximas aulas registradas no sistema acadêmico.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Frequência: {classInfo?.lessonsPerWeek} aula(s)/semana
            </span>
          </div>

          {/* Missed content alert if present */}
          {missedLessons && missedLessons.length > 0 && (
            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Você possui {missedLessons.length} aula(s) com falta registrada</span>
                <span className="text-[11px] text-amber-300/80">
                  Consulte os conteúdos abaixo para manter seu aprendizado em dia com a turma.
                </span>
              </div>
            </div>
          )}

          {/* Real Lessons List from Database */}
          <div className="space-y-3">
            {lessons && lessons.length > 0 ? (
              lessons.map((les: any) => {
                const isExpanded = expandedLessonId === les.id;
                const isCurrent = les.id === nextLesson?.id;

                return (
                  <div
                    key={les.id}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isCurrent
                        ? 'border-cyan-500/40 bg-slate-900/80 shadow-md shadow-cyan-500/10'
                        : les.status === 'COMPLETED'
                        ? 'border-slate-800/80 bg-slate-950/60'
                        : 'border-slate-800/60 bg-slate-950/40'
                    }`}
                  >
                    <div
                      onClick={() => setExpandedLessonId(isExpanded ? null : les.id)}
                      className="p-4 flex items-center justify-between cursor-pointer hover:bg-slate-900/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl font-mono text-xs font-bold ${
                            les.status === 'COMPLETED'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : isCurrent
                              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {les.lessonNumber}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-bold text-white truncate">{les.title}</h4>
                            {isCurrent && (
                              <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded shrink-0">
                                Próxima Aula
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-slate-400 block truncate">
                            {formatDate(les.date)} &bull; {les.scheduleTime} &bull; Prof. {les.teacherName || classInfo?.teacherName}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                        {les.attendanceStatus === 'PRESENT' && (
                          <span className="text-[11px] font-medium text-emerald-400 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Presente</span>
                          </span>
                        )}
                        {les.attendanceStatus === 'PENDING' && (
                          <span className="text-[11px] font-medium text-amber-400 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                            <Clock3 className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Pendente</span>
                          </span>
                        )}
                        {les.attendanceStatus === 'ABSENT' && (
                          <span className="text-[11px] font-medium text-rose-400 flex items-center gap-1 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-lg">
                            <span className="hidden sm:inline">Falta</span>
                          </span>
                        )}
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="p-4 bg-slate-900/40 border-t border-slate-800/80 text-xs space-y-3">
                        <div>
                          <strong className="text-cyan-400 block mb-1">
                            {les.status === 'COMPLETED' ? 'O que vimos em aula:' : 'O que vem depois (planejado):'}
                          </strong>
                          <p className="text-slate-300 leading-relaxed font-normal">
                            {les.status === 'COMPLETED'
                              ? les.actualContent || les.plannedContent
                              : les.plannedContent}
                          </p>
                        </div>

                        {les.activities && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Atividade: <strong className="text-slate-300 font-normal">{les.activities}</strong></span>
                          </div>
                        )}

                        {les.materials && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>Material da aula: <strong className="text-slate-300 font-normal">{les.materials}</strong></span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center text-xs text-slate-400 rounded-2xl border border-slate-800 bg-slate-950/40">
                Nenhuma aula cadastrada para esta turma.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT 3: RANKING & GAMIFICAÇÃO */}
      {activeTab === 'ranking' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Ranking da Turma ({classInfo?.name})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Classificação baseada exclusivamente no XP acadêmico acumulado em presenças e atividades.
              </p>
            </div>
            <div className="sm:text-right">
              <span className="text-xs text-slate-400">Sua posição:</span>
              <span className="font-mono font-bold text-emerald-400 text-sm block">#{student.rankingPosition} Lugar</span>
            </div>
          </div>

          {/* Visual Podium for Top 3 */}
          <div className="grid grid-cols-3 gap-3 pt-6 pb-2 items-end max-w-xl mx-auto">
            {/* 2nd Place */}
            {ranking[1] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="h-12 w-12 rounded-full border-2 border-slate-300 bg-slate-800 flex items-center justify-center font-bold text-slate-200 text-sm">
                    {ranking[1].name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-300 text-slate-900 text-[10px] font-black">
                    2
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-200 text-center line-clamp-1">{ranking[1].name}</span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">{ranking[1].xp} XP</span>
                <div className="w-full h-20 bg-slate-800/80 rounded-t-2xl mt-2 border border-slate-700/50 flex items-center justify-center font-black text-slate-500 text-xl">
                  2º
                </div>
              </div>
            )}

            {/* 1st Place (Gold Podium) */}
            {ranking[0] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="h-16 w-16 rounded-full border-2 border-amber-400 bg-amber-500/20 flex items-center justify-center font-black text-amber-300 text-base shadow-lg shadow-amber-500/20">
                    {ranking[0].name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-slate-950 text-xs font-black shadow-md">
                    👑
                  </span>
                </div>
                <span className="text-xs font-bold text-white text-center line-clamp-1">{ranking[0].name}</span>
                <span className="text-xs font-mono text-amber-400 font-bold">{ranking[0].xp} XP</span>
                <div className="w-full h-28 bg-gradient-to-t from-amber-500/20 to-amber-500/10 rounded-t-2xl mt-2 border-t-2 border-amber-400 flex items-center justify-center font-black text-amber-400 text-2xl shadow-xl">
                  1º
                </div>
              </div>
            )}

            {/* 3rd Place */}
            {ranking[2] && (
              <div className="flex flex-col items-center">
                <div className="relative mb-2">
                  <div className="h-12 w-12 rounded-full border-2 border-amber-700 bg-slate-800 flex items-center justify-center font-bold text-amber-600 text-sm">
                    {ranking[2].name.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-700 text-white text-[10px] font-black">
                    3
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-200 text-center line-clamp-1">{ranking[2].name}</span>
                <span className="text-[11px] font-mono text-cyan-400 font-bold">{ranking[2].xp} XP</span>
                <div className="w-full h-16 bg-slate-800/60 rounded-t-2xl mt-2 border border-slate-700/50 flex items-center justify-center font-black text-slate-500 text-xl">
                  3º
                </div>
              </div>
            )}
          </div>

          {/* Full ranking list */}
          <div className="space-y-2 rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4">
            {ranking.map((item: any) => (
              <div
                key={item.id}
                className={`flex items-center justify-between rounded-xl p-3 text-xs transition-colors ${
                  item.isCurrentUser
                    ? 'border-2 border-cyan-500 bg-cyan-500/10 font-bold text-white shadow-sm'
                    : 'border border-slate-800/60 bg-slate-950/40 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono font-bold w-6 text-center text-sm ${
                      item.position === 1
                        ? 'text-amber-400'
                        : item.position === 2
                        ? 'text-slate-300'
                        : item.position === 3
                        ? 'text-amber-600'
                        : 'text-slate-500'
                    }`}
                  >
                    #{item.position}
                  </span>
                  <div className="flex flex-col">
                    <span className="font-semibold text-white">
                      {item.name} {item.isCurrentUser && <strong className="text-cyan-400">(Você)</strong>}
                    </span>
                    <span className="text-[10px] text-slate-500">Matrícula ativa</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 font-mono text-cyan-400 text-sm">
                  <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                  <span>{item.xp} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT 4: GAMIFICAÇÃO & MEDALHAS */}
      {activeTab === 'badges' && (
        <div className="space-y-6">
          <GamificationSection
            currentXp={student.currentXp}
            level={student.level}
            streak={student.streak}
            rankingPosition={student.rankingPosition}
            totalInClass={student.totalInClass}
            badges={badges}
            onOpenAuction={() => setActiveTab('auction')}
          />

          {/* Extrato Recente de XP */}
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Extrato de XP (Pontos Acadêmicos)</h3>
              </div>
              <span className="text-xs text-slate-400">Total acumulado: {student.currentXp} XP</span>
            </div>

            <div className="space-y-2">
              {recentTransactions && recentTransactions.length > 0 ? (
                recentTransactions.map((tx: any) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-950/40 p-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 font-mono text-xs font-bold text-cyan-400">
                        +{tx.amount}
                      </span>
                      <div>
                        <span className="font-medium text-slate-200 block">{tx.description}</span>
                        <span className="text-[10px] text-slate-500">
                          {tx.type} &bull; {new Date(tx.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs font-bold text-cyan-400">+{tx.amount} XP</span>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-xs text-slate-500">
                  Nenhuma transação recente de XP.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
