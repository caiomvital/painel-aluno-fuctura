'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  XCircle,
  Calendar,
  Clock,
  BookOpen,
  School,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  CheckCheck,
  Search,
  Filter,
  Gavel,
  FileText,
  GraduationCap,
} from 'lucide-react';
import { AuctionSection } from '@/components/auction/AuctionSection';
import { StudentAttendanceModal } from '@/components/attendance/StudentAttendanceModal';
import { LessonDiaryModal } from '@/components/lessons/LessonDiaryModal';

export const DEFAULT_TEACHER_DASHBOARD_MOCK = {
  teacher: {
    id: 'teach_1',
    name: 'Prof. Henrique Silveira',
    specialty: 'Especialista em Arquitetura Java & Engenharia de Software Sênior',
  },
  classes: [
    {
      id: 'class_1',
      name: 'Java Fullstack - Turma Sábado',
      code: 'JAVA-SAB-2026.1',
      courseName: 'Academia Java Full Stack',
      daysOfWeek: 'SAB',
      scheduleTime: '08:30 - 12:30',
      lessonsPerWeek: 1,
      totalStudents: 15,
      totalLessons: 16,
      completedLessonsCount: 7,
      students: [
        { id: 'stud_1', name: 'João Pedro da Silva', registrationNumber: 'FUC-2026-0891', currentXp: 1240, confirmedCount: 7 },
        { id: 'stud_2', name: 'Maria Eduarda Santos', registrationNumber: 'FUC-2026-0892', currentXp: 1450, confirmedCount: 7 },
        { id: 'stud_3', name: 'Lucas Albuquerque', registrationNumber: 'FUC-2026-0893', currentXp: 1380, confirmedCount: 6 },
        { id: 'stud_4', name: 'Beatriz Costa', registrationNumber: 'FUC-2026-0894', currentXp: 1290, confirmedCount: 6 },
        { id: 'stud_5', name: 'Gabriel Martins', registrationNumber: 'FUC-2026-0895', currentXp: 1100, confirmedCount: 5 },
      ],
      nextLesson: {
        id: 'les_j8',
        lessonNumber: 8,
        title: 'Herança, Polimorfismo & Classes Abstratas',
        date: '2026-03-28T00:00:00.000Z',
        scheduleTime: '08:30 - 12:30',
        plannedContent: 'Herança simples em Java, palavra-chave super, polimorfismo dinâmico e contratos abstratos.',
        actualContent: null,
      },
    },
  ],
  upcomingLesson: {
    id: 'les_j8',
    className: 'Java Fullstack - Turma Sábado',
    lessonNumber: 8,
    title: 'Herança, Polimorfismo & Classes Abstratas',
    date: '2026-03-28T00:00:00.000Z',
    scheduleTime: '08:30 - 12:30',
    plannedContent: 'Herança simples em Java, palavra-chave super, polimorfismo dinâmico e contratos abstratos.',
  },
  pendingAttendances: [
    {
      id: 'att_pend_mock_1',
      studentName: 'Gabriel Martins',
      studentReg: 'FUC-2026-0895',
      className: 'Java Fullstack - Turma Sábado',
      lessonNumber: 7,
      lessonTitle: 'Aprofundamento em POO: Encapsulamento Avançado',
      requestedAt: '2026-03-21T08:35:00.000Z',
    },
    {
      id: 'att_pend_mock_2',
      studentName: 'Camila Fernandes',
      studentReg: 'FUC-2026-0896',
      className: 'Java Fullstack - Turma Sábado',
      lessonNumber: 7,
      lessonTitle: 'Aprofundamento em POO: Encapsulamento Avançado',
      requestedAt: '2026-03-21T08:40:00.000Z',
    },
  ],
};

export const TeacherView: React.FC = () => {
  const [data, setData] = useState<any>(DEFAULT_TEACHER_DASHBOARD_MOCK);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedClassId, setExpandedClassId] = useState<string | null>('class_1');
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [teacherTab, setTeacherTab] = useState<'attendance' | 'auction' | 'classes' | 'schedule' | 'attendance-management'>('attendance');
  const [selectedAttendanceStudent, setSelectedAttendanceStudent] = useState<{ id: string; name: string } | null>(null);
  const [selectedLessonForDiaryId, setSelectedLessonForDiaryId] = useState<string | null>(null);
  const [classSubView, setClassSubView] = useState<Record<string, 'students' | 'lessons'>>({});

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/teacher/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        if (json.classes && json.classes.length > 0 && !expandedClassId) {
          setExpandedClassId(json.classes[0].id);
        }
      } else {
        setData(DEFAULT_TEACHER_DASHBOARD_MOCK);
      }
      setError(null);
    } catch {
      setData(DEFAULT_TEACHER_DASHBOARD_MOCK);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    fetch('/api/teacher/dashboard')
      .then((res) => (res.ok ? res.json() : DEFAULT_TEACHER_DASHBOARD_MOCK))
      .then((json) => {
        if (isMounted && json) {
          setData(json);
          if (json.classes && json.classes.length > 0 && !expandedClassId) {
            setExpandedClassId(json.classes[0].id);
          }
        }
      })
      .catch(() => {
        if (isMounted) {
          setData(DEFAULT_TEACHER_DASHBOARD_MOCK);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [expandedClassId]);

  const handleConfirmAttendance = async (attendanceId: string, studentName?: string) => {
    setActionLoading(attendanceId);
    setActionMessage(null);
    try {
      const res = await fetch('/api/teacher/attendance/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Erro ao confirmar presença.');
      }
      setActionMessage(`Presença confirmada para ${studentName || 'aluno'}! XP concedido no backend.`);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAll = async () => {
    if (!data?.pendingAttendances || data.pendingAttendances.length === 0) return;
    setActionLoading('ALL');
    setActionMessage(null);
    try {
      for (const att of data.pendingAttendances) {
        await fetch('/api/teacher/attendance/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attendanceId: att.id }),
        });
      }
      setActionMessage('Todas as presenças pendentes foram confirmadas e o XP foi creditado!');
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Erro ao confirmar presenças.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectAttendance = async (attendanceId: string, studentName?: string) => {
    const reason = prompt(`Motivo da recusa para ${studentName || 'o aluno'}:`, 'Não compareceu à aula ou limite de horário expirado.');
    if (reason === null) return;

    setActionLoading(attendanceId);
    setActionMessage(null);
    try {
      const res = await fetch('/api/teacher/attendance/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ attendanceId, reason }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || 'Erro ao recusar presença.');
      }
      setActionMessage(`Presença recusada para ${studentName || 'aluno'}.`);
      await fetchDashboard();
    } catch (err: any) {
      alert(err.message || 'Erro ao recusar.');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-9 w-9 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
          <span className="text-xs text-slate-400">Carregando painel docente...</span>
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

  const { teacher, classes, upcomingLesson, pendingAttendances } = data;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6">
      {/* 1. Header with Teacher Identity & Counters */}
      <div className="rounded-3xl border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-900/90 to-[#0b1329] p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Painel Docente</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs text-slate-400">Fuctura Tecnologia</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-1">{teacher.name}</h1>
            <p className="text-xs text-slate-400 mt-1 max-w-xl">{teacher.specialty}</p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 px-4 py-2.5 text-center">
              <span className="block font-mono text-xl font-black text-cyan-400">{classes.length}</span>
              <span className="text-[10px] text-slate-400 font-medium">Turmas Ativas</span>
            </div>

            <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-center">
              <span className="block font-mono text-xl font-black text-amber-400">{pendingAttendances.length}</span>
              <span className="text-[10px] text-amber-300 font-medium">Presenças Fila</span>
            </div>
          </div>
        </div>
      </div>

      {actionMessage && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 shadow-md">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="font-semibold">{actionMessage}</span>
        </div>
      )}

      {/* 2. Navigation Tabs */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-2xl overflow-x-auto">
        <button
          onClick={() => setTeacherTab('attendance')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            teacherTab === 'attendance'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Fila de Chamada &amp; Presença ({pendingAttendances.length})</span>
        </button>

        <button
          onClick={() => setTeacherTab('auction')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            teacherTab === 'auction'
              ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20 font-bold'
              : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10'
          }`}
        >
          <Gavel className="w-3.5 h-3.5" />
          <span>Itens do Leilão 🔥</span>
        </button>

        <button
          onClick={() => setTeacherTab('classes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            teacherTab === 'classes'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Minhas Turmas &amp; Alunos</span>
        </button>

        <button
          onClick={() => setTeacherTab('attendance-management')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            teacherTab === 'attendance-management'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Frequência Escolar (Presente/Ausente/Justificado)</span>
        </button>

        <button
          onClick={() => setTeacherTab('schedule')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold rounded-xl transition-all whitespace-nowrap ${
            teacherTab === 'schedule'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>Próxima Aula Agendada</span>
        </button>
      </div>

      {/* TAB 1: FILA DE PRESENÇA (CHAMADA) */}
      {teacherTab === 'attendance' && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Solicitações de Presença para Validação</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Alunos marcam presença no aplicativo. Confirme ou recuse com base na participação em aula.
              </p>
            </div>

            {pendingAttendances.length > 0 && (
              <button
                onClick={handleConfirmAll}
                disabled={actionLoading === 'ALL'}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-md hover:bg-emerald-500 transition-colors disabled:opacity-50"
              >
                <CheckCheck className="w-4 h-4" />
                <span>{actionLoading === 'ALL' ? 'Processando...' : 'Confirmar Todas'}</span>
              </button>
            )}
          </div>

          {pendingAttendances.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center text-slate-400 border border-dashed border-slate-800 rounded-2xl">
              <CheckCircle2 className="w-10 h-10 text-emerald-400/60 mb-2" />
              <h4 className="text-sm font-bold text-slate-200">Fila de presença limpa!</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-sm">
                Nenhum aluno aguardando validação neste momento. Quando um aluno marcar presença, ele aparecerá aqui instantaneamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingAttendances.map((att: any) => (
                <div
                  key={att.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-amber-500/20 bg-slate-950/70 p-4 transition-all hover:border-amber-500/30"
                >
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-bold text-white">{att.studentName}</span>
                      <span className="font-mono text-[11px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded font-semibold">
                        {att.studentReg}
                      </span>
                    </div>
                    <span className="text-xs text-slate-300 mt-1">
                      {att.className} &bull; Aula {att.lessonNumber}: {att.lessonTitle}
                    </span>
                    <span className="text-[11px] text-slate-500 mt-0.5">
                      Horário da solicitação: {new Date(att.requestedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <button
                      onClick={() => handleConfirmAttendance(att.id, att.studentName)}
                      disabled={actionLoading === att.id}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{actionLoading === att.id ? 'Salvando...' : 'Confirmar Presença'}</span>
                    </button>
                    <button
                      onClick={() => handleRejectAttendance(att.id, att.studentName)}
                      disabled={actionLoading === att.id}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:border-rose-500/30 hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Recusar</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Leilão Fuctura na página inicial do Professor */}
      {teacherTab === 'attendance' && (
        <div className="pt-2">
          <AuctionSection
            userRole="PROFESSOR"
            userName={teacher.name}
            userBalance={2500}
          />
        </div>
      )}

      {/* TAB: LEILÃO COMPLETO */}
      {teacherTab === 'auction' && (
        <AuctionSection
          userRole="PROFESSOR"
          userName={teacher.name}
          userBalance={2500}
        />
      )}

      {/* TAB 2: MINHAS TURMAS & ALUNOS */}
      {teacherTab === 'classes' && (
        <div className="space-y-4">
          {classes.map((cls: any) => {
            const isExpanded = expandedClassId === cls.id;
            return (
              <div
                key={cls.id}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/60 overflow-hidden shadow-xl"
              >
                {/* Header */}
                <div
                  onClick={() => setExpandedClassId(isExpanded ? null : cls.id)}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-6 cursor-pointer hover:bg-slate-800/30 transition-colors gap-3"
                >
                  <div>
                    <div className="flex items-center gap-2.5">
                      <h3 className="text-lg font-bold text-white">{cls.name}</h3>
                      <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded font-bold">
                        {cls.code}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1.5">
                      <span>{cls.courseName}</span>
                      <span>&bull;</span>
                      <span>{cls.daysOfWeek} ({cls.scheduleTime})</span>
                      <span>&bull;</span>
                      <span className="text-cyan-400 font-semibold">{cls.lessonsPerWeek} aula(s)/semana</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1.5 text-xs text-slate-200 bg-slate-800/80 px-3.5 py-2 rounded-xl font-semibold border border-slate-700/60">
                      <Users className="w-4 h-4 text-cyan-400" />
                      <span>{cls.totalStudents} alunos matriculados</span>
                    </span>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Class Details */}
                {isExpanded && (() => {
                  const subView = classSubView[cls.id] || 'students';
                  return (
                    <div className="border-t border-slate-800/80 p-6 bg-slate-950/50 space-y-4">
                      {/* Sub-view Navigation */}
                      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800/60">
                        <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClassSubView((prev) => ({ ...prev, [cls.id]: 'students' }));
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                              subView === 'students'
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            Alunos &amp; Frequência ({cls.students.length})
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setClassSubView((prev) => ({ ...prev, [cls.id]: 'lessons' }));
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                              subView === 'lessons'
                                ? 'bg-cyan-500 text-slate-950 font-bold'
                                : 'text-slate-400 hover:text-white'
                            }`}
                          >
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Diário de Aulas ({cls.lessons?.length || cls.totalLessons})</span>
                          </button>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">
                          {cls.completedLessonsCount} de {cls.totalLessons} aulas ministradas
                        </span>
                      </div>

                      {/* SUBVIEW 1: QUADRO DE ALUNOS */}
                      {subView === 'students' && (
                        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                          {cls.students.map((student: any) => {
                            const attendancePct =
                              cls.completedLessonsCount > 0
                                ? Math.round((student.confirmedCount / cls.completedLessonsCount) * 100)
                                : 100;
                            return (
                              <div
                                key={student.id}
                                className="flex items-center justify-between rounded-2xl border border-slate-800/70 bg-slate-900/60 p-3.5 text-xs hover:border-slate-700 transition-colors"
                              >
                                <div className="flex flex-col">
                                  <span className="font-bold text-white text-sm">{student.name}</span>
                                  <span className="text-[11px] text-slate-400 font-mono mt-0.5">
                                    {student.registrationNumber}
                                  </span>
                                </div>

                                <div className="flex items-center gap-3">
                                  <div className="flex flex-col text-right">
                                    <span className="font-mono font-bold text-cyan-400">{student.currentXp} XP</span>
                                    <span className="text-[10px] text-slate-400">
                                      {student.confirmedCount} presenças ({attendancePct}%)
                                    </span>
                                  </div>
                                  <button
                                    onClick={() => setSelectedAttendanceStudent({ id: student.id, name: student.name })}
                                    className="flex items-center gap-1 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1.5 text-[11px] font-bold text-cyan-300 hover:bg-cyan-500/20 transition-all shrink-0 cursor-pointer"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Frequência</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* SUBVIEW 2: DIÁRIO DE AULAS */}
                      {subView === 'lessons' && (
                        <div className="space-y-2.5">
                          {(cls.lessons || []).length === 0 ? (
                            <div className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-800">
                              Nenhuma aula cadastrada nesta turma.
                            </div>
                          ) : (
                            cls.lessons.map((lesson: any) => (
                              <div
                                key={lesson.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl border border-slate-800/70 bg-slate-900/60 text-xs hover:border-slate-700 transition-colors gap-3"
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded text-[11px]">
                                      Aula {lesson.lessonNumber}
                                    </span>
                                    <h4 className="font-bold text-white text-sm truncate">{lesson.title}</h4>
                                    <span
                                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                        lesson.status === 'COMPLETED'
                                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                          : 'bg-slate-800 text-slate-300'
                                      }`}
                                    >
                                      {lesson.status === 'COMPLETED' ? 'Concluída' : 'Agendada'}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2.5 text-slate-400 text-xs mt-1.5">
                                    <span>
                                      {new Date(lesson.date).toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                      })}{' '}
                                      &bull; {lesson.scheduleTime}
                                    </span>
                                    <span>&bull;</span>
                                    <span className="text-cyan-300 font-medium">
                                      {lesson.plannedTopics?.length || 0} tópico(s) planejado(s)
                                    </span>
                                    <span>&bull;</span>
                                    <span className="text-emerald-300 font-medium">
                                      {lesson.taughtTopics?.length || 0} ministrado(s)
                                    </span>
                                    <span>&bull;</span>
                                    <span className="text-amber-300 font-medium">
                                      {lesson.materials?.length || 0} link(s)
                                    </span>
                                  </div>
                                </div>

                                <button
                                  onClick={() => setSelectedLessonForDiaryId(lesson.id)}
                                  className="flex items-center justify-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-3.5 py-2 text-xs transition-all shrink-0 cursor-pointer shadow-sm self-start sm:self-center"
                                >
                                  <BookOpen className="w-3.5 h-3.5" />
                                  <span>Editar Diário</span>
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 4: FREQUÊNCIA ESCOLAR DOS ALUNOS */}
      {teacherTab === 'attendance-management' && (
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-5 border-b border-slate-800/80">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  <span>Diário de Frequência Escolar &bull; Gestão do Professor</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Selecione um aluno para inspecionar e atualizar presenças recentes com status: <strong>Presente</strong>, <strong>Ausente</strong> ou <strong>Justificado</strong>.
                </p>
              </div>

              <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1.5 rounded-xl self-start sm:self-center">
                Acesso Restrito: Docente
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {classes.map((cls: any) => (
                <div key={cls.id} className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h4 className="text-sm font-bold text-white">{cls.name}</h4>
                      <span className="text-[11px] text-slate-400 font-mono">{cls.code} &bull; {cls.scheduleTime}</span>
                    </div>
                    <span className="text-xs font-bold text-cyan-400 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      {cls.students.length} alunos
                    </span>
                  </div>

                  <div className="space-y-2">
                    {cls.students.map((st: any) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between rounded-xl border border-slate-800/60 bg-slate-900/40 p-3 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 font-bold text-xs text-cyan-400">
                            {st.name.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-white text-xs block">{st.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{st.registrationNumber}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => setSelectedAttendanceStudent({ id: st.id, name: st.name })}
                          className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Ver Frequência</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PRÓXIMA AULA AGENDADA */}
      {teacherTab === 'schedule' && upcomingLesson && (
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/60 p-6 backdrop-blur-md shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-cyan-400">Próxima Aula Agendada</span>
            <span className="text-xs font-medium text-slate-300 bg-slate-800 px-3 py-1 rounded-xl">
              {upcomingLesson.className}
            </span>
          </div>

          <h3 className="text-xl font-bold text-white">
            Aula {upcomingLesson.lessonNumber}: {upcomingLesson.title}
          </h3>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              {new Date(upcomingLesson.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit' })}
            </span>
            <span>&bull;</span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              {upcomingLesson.scheduleTime}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-4 text-xs space-y-1">
            <span className="font-bold text-cyan-400 uppercase tracking-wider text-[11px] block">
              Plano de Aula &amp; Conteúdo Previsto
            </span>
            <p className="text-slate-300 leading-relaxed font-normal">{upcomingLesson.plannedContent}</p>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              onClick={() => setSelectedLessonForDiaryId(upcomingLesson.id)}
              className="flex items-center gap-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shadow-md transition-all cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Gerenciar Diário desta Aula</span>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Frequência Escolar do Aluno */}
      {selectedAttendanceStudent && (
        <StudentAttendanceModal
          isOpen={!!selectedAttendanceStudent}
          onClose={() => setSelectedAttendanceStudent(null)}
          studentId={selectedAttendanceStudent.id}
          studentName={selectedAttendanceStudent.name}
          userRole="PROFESSOR"
          onAttendanceChanged={fetchDashboard}
        />
      )}

      {/* Modal de Diário de Aula e Materiais */}
      {selectedLessonForDiaryId && (
        <LessonDiaryModal
          isOpen={!!selectedLessonForDiaryId}
          onClose={() => setSelectedLessonForDiaryId(null)}
          lessonId={selectedLessonForDiaryId}
          userRole="PROFESSOR"
          onSaved={fetchDashboard}
        />
      )}
    </div>
  );
};
