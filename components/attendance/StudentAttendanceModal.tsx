'use client';

import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Calendar,
  X,
  ShieldCheck,
  AlertCircle,
  Flame,
  Zap,
  User,
  GraduationCap,
  Filter,
  Check,
  Send,
} from 'lucide-react';

interface StudentAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName?: string;
  userRole: 'PROFESSOR' | 'DIRETOR';
  onAttendanceChanged?: () => void;
}

export const StudentAttendanceModal: React.FC<StudentAttendanceModalProps> = ({
  isOpen,
  onClose,
  studentId,
  studentName,
  userRole,
  onAttendanceChanged,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'ABSENT' | 'EXCUSED'>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [justifyingLessonId, setJustifyingLessonId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/student-attendance?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao carregar frequência escolar.');
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && studentId) {
      let isMounted = true;
      fetch(`/api/admin/student-attendance?studentId=${encodeURIComponent(studentId)}`)
        .then((res) => {
          if (!res.ok) throw new Error('Erro ao carregar dados de frequência.');
          return res.json();
        })
        .then((json) => {
          if (isMounted) {
            setData(json);
            setError(null);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (isMounted) {
            setError(err.message);
            setLoading(false);
          }
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  const handleUpdateStatus = async (
    lessonId: string,
    newStatus: 'PRESENT' | 'ABSENT' | 'EXCUSED',
    reason?: string
  ) => {
    setActionLoading(lessonId);
    setFeedbackMsg(null);

    try {
      const res = await fetch('/api/admin/student-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: data?.student?.id || studentId,
          lessonId,
          status: newStatus,
          justificationReason: reason,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || 'Não foi possível atualizar o status de presença.');
      }

      if (resJson.history) {
        setData(resJson.history);
      } else {
        await fetchHistory();
      }

      setJustifyingLessonId(null);
      setJustificationText('');
      setFeedbackMsg({
        text: `Presença atualizada com sucesso para ${newStatus}!`,
        type: 'success',
      });

      if (onAttendanceChanged) {
        onAttendanceChanged();
      }
    } catch (err: any) {
      setFeedbackMsg({ text: err.message, type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredLessons = data?.lessons?.filter((l: any) => {
    if (statusFilter === 'ALL') return true;
    return l.status === statusFilter;
  }) || [];

  const studentInfo = data?.student;
  const metrics = data?.metrics;
  const classInfo = data?.classInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
      <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl border border-slate-800 bg-[#080d1a] shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  Frequência Escolar &bull; {studentInfo?.name || studentName || 'Aluno'}
                </h2>
                <span className="flex items-center gap-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  {userRole === 'PROFESSOR' ? 'Painel do Professor' : 'Painel da Diretoria'}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Gestão individual de presenças, faltas e justificativas pedagógicas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl border border-slate-800 bg-slate-800/50 p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex min-h-[300px] flex-col items-center justify-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent" />
              <span className="text-xs text-slate-400">Carregando diário de frequência do aluno...</span>
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-5 text-center text-rose-300">
              <AlertCircle className="mx-auto w-6 h-6 mb-2" />
              <p className="text-xs font-semibold">{error}</p>
              <button
                onClick={fetchHistory}
                className="mt-3 rounded-xl bg-slate-800 px-4 py-1.5 text-xs text-white hover:bg-slate-700"
              >
                Tentar carregar novamente
              </button>
            </div>
          ) : (
            <>
              {/* Feedback Alert */}
              {feedbackMsg && (
                <div
                  className={`flex items-center justify-between rounded-2xl p-3 text-xs font-semibold ${
                    feedbackMsg.type === 'success'
                      ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border border-rose-500/30 bg-rose-500/10 text-rose-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {feedbackMsg.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span>{feedbackMsg.text}</span>
                  </div>
                  <button onClick={() => setFeedbackMsg(null)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Student Summary Card */}
              <div className="rounded-2xl border border-slate-800/80 bg-slate-900/60 p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white font-bold text-lg">
                    {studentInfo?.name?.charAt(0) || 'A'}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">{studentInfo?.name}</h3>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="font-mono text-cyan-400">Matrícula: {studentInfo?.registrationNumber}</span>
                      <span>&bull;</span>
                      <span>{classInfo?.name}</span>
                      <span>&bull;</span>
                      <span className="text-slate-300">{classInfo?.teacherName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-amber-400">
                      <Flame className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{studentInfo?.streak} aulas</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Streak</span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1 font-mono text-sm font-bold text-cyan-400">
                      <Zap className="w-3.5 h-3.5 fill-cyan-400" />
                      <span>{studentInfo?.currentXp} XP</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block">Nível {studentInfo?.level}</span>
                  </div>

                  <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-center">
                    <span className="font-mono text-lg font-black text-emerald-400">
                      {metrics?.attendanceRate}%
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-300 block">Frequência Geral</span>
                  </div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-mono text-xl font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{metrics?.presentCount || 0}</span>
                  </div>
                  <span className="text-xs font-semibold text-emerald-300/80 mt-1 block">Presente</span>
                  <span className="text-[10px] text-slate-500">Presenças confirmadas</span>
                </div>

                <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-rose-400 font-mono text-xl font-bold">
                    <XCircle className="w-5 h-5" />
                    <span>{metrics?.absentCount || 0}</span>
                  </div>
                  <span className="text-xs font-semibold text-rose-300/80 mt-1 block">Ausente</span>
                  <span className="text-[10px] text-slate-500">Faltas não justificadas</span>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 font-mono text-xl font-bold">
                    <FileText className="w-5 h-5" />
                    <span>{metrics?.justifiedCount || 0}</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-300/80 mt-1 block">Justificado</span>
                  <span className="text-[10px] text-slate-500">Atestados / Motivo válido</span>
                </div>
              </div>

              {/* Filter Tabs for Recent Classes */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-sm font-bold text-white">Lista de Aulas Recentes</h4>
                  <span className="text-xs text-slate-500">({filteredLessons.length} registros)</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                      statusFilter === 'ALL'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Todas ({metrics?.totalLessons || 0})
                  </button>
                  <button
                    onClick={() => setStatusFilter('PRESENT')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                      statusFilter === 'PRESENT'
                        ? 'bg-emerald-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-emerald-400'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Presente ({metrics?.presentCount || 0})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('ABSENT')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                      statusFilter === 'ABSENT'
                        ? 'bg-rose-500 text-white font-bold'
                        : 'text-slate-400 hover:text-rose-400'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Ausente ({metrics?.absentCount || 0})</span>
                  </button>
                  <button
                    onClick={() => setStatusFilter('EXCUSED')}
                    className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                      statusFilter === 'EXCUSED'
                        ? 'bg-amber-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-amber-400'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Justificado ({metrics?.justifiedCount || 0})</span>
                  </button>
                </div>
              </div>

              {/* Recent Classes List */}
              <div className="space-y-3">
                {filteredLessons.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-8 text-center text-xs text-slate-500">
                    Nenhuma aula encontrada para o filtro selecionado.
                  </div>
                ) : (
                  filteredLessons.map((lesson: any) => {
                    const isJustifying = justifyingLessonId === lesson.id;

                    return (
                      <div
                        key={lesson.id}
                        className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 transition-all hover:border-slate-700/80 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs font-bold text-slate-300">
                              #{lesson.lessonNumber}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-white">{lesson.title}</h5>
                                <span className="text-[10px] text-slate-500 font-mono">
                                  {new Date(lesson.date).toLocaleDateString('pt-BR')} &bull; {lesson.scheduleTime}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {lesson.actualContent || lesson.plannedContent}
                              </p>
                            </div>
                          </div>

                          {/* Intuitive Status Badge */}
                          <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
                            {lesson.status === 'PRESENT' && (
                              <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400 shadow-sm">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span>Presente</span>
                              </span>
                            )}

                            {lesson.status === 'ABSENT' && (
                              <span className="flex items-center gap-1.5 rounded-full border border-rose-500/30 bg-rose-500/10 px-3 py-1 text-xs font-bold text-rose-400 shadow-sm">
                                <XCircle className="w-4 h-4 text-rose-400" />
                                <span>Ausente</span>
                              </span>
                            )}

                            {lesson.status === 'EXCUSED' && (
                              <span className="flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400 shadow-sm">
                                <FileText className="w-4 h-4 text-amber-400" />
                                <span>Justificado</span>
                              </span>
                            )}

                            {lesson.status === 'PENDING' && (
                              <span className="flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-800/60 px-3 py-1 text-xs font-medium text-slate-400">
                                <Clock className="w-4 h-4" />
                                <span>Agendada / Pendente</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Justification Note Display */}
                        {lesson.justificationReason && (
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-2.5 text-xs text-amber-300 flex items-start gap-2">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <strong className="font-semibold block text-[11px] text-amber-200">
                                Justificativa Registrada:
                              </strong>
                              <span>{lesson.justificationReason}</span>
                            </div>
                          </div>
                        )}

                        {/* Interactive Status Changer (Exclusivo Professor / Diretor) */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-900 text-xs">
                          <span className="text-[11px] text-slate-500">
                            Alterar registro pedagógico:
                          </span>

                          <div className="flex items-center gap-1.5">
                            {/* Button Presente */}
                            <button
                              disabled={actionLoading === lesson.id || lesson.status === 'PRESENT'}
                              onClick={() => handleUpdateStatus(lesson.id, 'PRESENT')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                lesson.status === 'PRESENT'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 opacity-70 cursor-default'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-400 hover:border-emerald-500/30'
                              }`}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Presente</span>
                            </button>

                            {/* Button Ausente */}
                            <button
                              disabled={actionLoading === lesson.id || lesson.status === 'ABSENT'}
                              onClick={() => handleUpdateStatus(lesson.id, 'ABSENT')}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                lesson.status === 'ABSENT'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 opacity-70 cursor-default'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-rose-500/20 hover:text-rose-400 hover:border-rose-500/30'
                              }`}
                            >
                              <XCircle className="w-3.5 h-3.5 text-rose-400" />
                              <span>Ausente</span>
                            </button>

                            {/* Button Justificar */}
                            <button
                              disabled={actionLoading === lesson.id}
                              onClick={() => {
                                setJustifyingLessonId(isJustifying ? null : lesson.id);
                                setJustificationText(lesson.justificationReason || '');
                              }}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                                lesson.status === 'EXCUSED'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                                  : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-amber-500/20 hover:text-amber-400 hover:border-amber-500/30'
                              }`}
                            >
                              <FileText className="w-3.5 h-3.5 text-amber-400" />
                              <span>{isJustifying ? 'Cancelar' : 'Justificar Falta'}</span>
                            </button>
                          </div>
                        </div>

                        {/* Inline Justification Form */}
                        {isJustifying && (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 space-y-2 mt-2">
                            <label className="text-xs font-bold text-amber-300 block">
                              Motivo da Falta Justificada (Atestado médico, declaração corporativa, etc.):
                            </label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={justificationText}
                                onChange={(e) => setJustificationText(e.target.value)}
                                placeholder="Ex: Atestado médico de 2 dias protocolado na secretaria..."
                                className="flex-1 rounded-xl border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                              />
                              <button
                                disabled={actionLoading === lesson.id || !justificationText.trim()}
                                onClick={() =>
                                  handleUpdateStatus(lesson.id, 'EXCUSED', justificationText.trim())
                                }
                                className="flex items-center gap-1 rounded-xl bg-amber-500 hover:bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors disabled:opacity-50"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Salvar Justificativa</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800/80 bg-slate-900/60 px-6 py-3.5 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Módulo de Frequência Escolar &bull; Apenas Professor e Diretor podem registrar ou alterar</span>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 font-semibold text-white transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
