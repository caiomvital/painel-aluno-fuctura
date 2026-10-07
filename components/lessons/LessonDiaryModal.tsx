'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Save,
  Calendar,
  Clock,
  User,
  GraduationCap,
  Layers,
  FileText,
  Link as LinkIcon,
  Check,
  RefreshCw,
  Copy,
} from 'lucide-react';
import { LessonDiaryData, SupportMaterialItem } from '@/lib/academic-service';

interface LessonDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  lessonId: string;
  userRole: 'PROFESSOR' | 'DIRETOR' | 'ALUNO';
  onSaved?: () => void;
}

export const LessonDiaryModal: React.FC<LessonDiaryModalProps> = ({
  isOpen,
  onClose,
  lessonId,
  userRole,
  onSaved,
}) => {
  const [diary, setDiary] = useState<LessonDiaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<'planned' | 'taught' | 'materials'>('planned');

  // Local state for editing
  const [plannedTopics, setPlannedTopics] = useState<string[]>([]);
  const [taughtTopics, setTaughtTopics] = useState<string[]>([]);
  const [materials, setMaterials] = useState<SupportMaterialItem[]>([]);

  // Inputs for adding new items
  const [newPlannedTopic, setNewPlannedTopic] = useState('');
  const [editingPlannedIndex, setEditingPlannedIndex] = useState<number | null>(null);
  const [editingPlannedValue, setEditingPlannedValue] = useState('');

  const [newTaughtTopic, setNewTaughtTopic] = useState('');
  const [editingTaughtIndex, setEditingTaughtIndex] = useState<number | null>(null);
  const [editingTaughtValue, setEditingTaughtValue] = useState('');

  // Form for materials
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialDescription, setNewMaterialDescription] = useState('');
  const [editingMaterialIndex, setEditingMaterialIndex] = useState<number | null>(null);
  const [editingMaterialTitle, setEditingMaterialTitle] = useState('');
  const [editingMaterialUrl, setEditingMaterialUrl] = useState('');
  const [editingMaterialDescription, setEditingMaterialDescription] = useState('');

  const isReadOnly = userRole === 'ALUNO';

  const refreshDiary = () => {
    if (!lessonId) return;
    setLoading(true);
    fetch(`/api/lessons/${lessonId}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!ok) {
          setError(data.error || 'Erro ao carregar diário da aula.');
        } else {
          setDiary(data);
          setPlannedTopics(data.plannedTopics || []);
          setTaughtTopics(data.taughtTopics || []);
          setMaterials(data.materials || []);
          setError(null);
        }
      })
      .catch((err: any) => {
        setError(err.message || 'Erro ao carregar diário da aula.');
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isOpen || !lessonId) return;

    let isMounted = true;
    fetch(`/api/lessons/${lessonId}`)
      .then((res) => res.json().then((data) => ({ ok: res.ok, data })))
      .then(({ ok, data }) => {
        if (!isMounted) return;
        if (!ok) {
          setError(data.error || 'Erro ao carregar diário da aula.');
        } else {
          setDiary(data);
          setPlannedTopics(data.plannedTopics || []);
          setTaughtTopics(data.taughtTopics || []);
          setMaterials(data.materials || []);
          setError(null);
        }
      })
      .catch((err: any) => {
        if (isMounted) setError(err.message || 'Erro ao carregar diário da aula.');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, lessonId]);

  // Validation helper
  const isValidUrl = (urlStr: string) => {
    const trimmed = urlStr.trim();
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) return false;
    try {
      new URL(trimmed);
      return true;
    } catch {
      return false;
    }
  };

  // Planned Topics Handlers
  const handleAddPlannedTopic = () => {
    if (!newPlannedTopic.trim()) return;
    setPlannedTopics((prev) => [...prev, newPlannedTopic.trim()]);
    setNewPlannedTopic('');
  };

  const handleRemovePlannedTopic = (index: number) => {
    setPlannedTopics((prev) => prev.filter((_, i) => i !== index));
    if (editingPlannedIndex === index) setEditingPlannedIndex(null);
  };

  const handleSaveEditPlanned = (index: number) => {
    if (!editingPlannedValue.trim()) return;
    setPlannedTopics((prev) => {
      const updated = [...prev];
      updated[index] = editingPlannedValue.trim();
      return updated;
    });
    setEditingPlannedIndex(null);
  };

  // Taught Topics Handlers
  const handleAddTaughtTopic = () => {
    if (!newTaughtTopic.trim()) return;
    setTaughtTopics((prev) => [...prev, newTaughtTopic.trim()]);
    setNewTaughtTopic('');
  };

  const handleRemoveTaughtTopic = (index: number) => {
    setTaughtTopics((prev) => prev.filter((_, i) => i !== index));
    if (editingTaughtIndex === index) setEditingTaughtIndex(null);
  };

  const handleSaveEditTaught = (index: number) => {
    if (!editingTaughtValue.trim()) return;
    setTaughtTopics((prev) => {
      const updated = [...prev];
      updated[index] = editingTaughtValue.trim();
      return updated;
    });
    setEditingTaughtIndex(null);
  };

  const handleCopyPlannedToTaught = () => {
    if (plannedTopics.length === 0) return;
    // Copies planned topics as base for taught topics, keeping them distinct
    setTaughtTopics([...plannedTopics]);
  };

  // Materials Handlers
  const handleAddMaterial = () => {
    if (!newMaterialTitle.trim()) {
      setError('O título do material é obrigatório.');
      return;
    }
    if (!newMaterialUrl.trim()) {
      setError('A URL do material é obrigatória.');
      return;
    }
    if (!isValidUrl(newMaterialUrl)) {
      setError('A URL deve ser válida e começar com http:// ou https://');
      return;
    }

    const newItem: SupportMaterialItem = {
      id: `mat_${Date.now()}`,
      title: newMaterialTitle.trim(),
      url: newMaterialUrl.trim(),
      description: newMaterialDescription.trim() || undefined,
    };

    setMaterials((prev) => [...prev, newItem]);
    setNewMaterialTitle('');
    setNewMaterialUrl('');
    setNewMaterialDescription('');
    setError(null);
  };

  const handleRemoveMaterial = (index: number) => {
    setMaterials((prev) => prev.filter((_, i) => i !== index));
    if (editingMaterialIndex === index) setEditingMaterialIndex(null);
  };

  const handleSaveEditMaterial = (index: number) => {
    if (!editingMaterialTitle.trim()) {
      setError('O título do material é obrigatório.');
      return;
    }
    if (!isValidUrl(editingMaterialUrl)) {
      setError('A URL deve ser válida e começar com http:// ou https://');
      return;
    }

    setMaterials((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        title: editingMaterialTitle.trim(),
        url: editingMaterialUrl.trim(),
        description: editingMaterialDescription.trim() || undefined,
      };
      return updated;
    });
    setEditingMaterialIndex(null);
    setError(null);
  };

  // Save to Server
  const handleSaveDiary = async () => {
    if (isReadOnly) return;
    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    // Validate materials before saving
    for (const mat of materials) {
      if (!isValidUrl(mat.url)) {
        setError(`A URL "${mat.url}" de "${mat.title}" é inválida. Use http:// ou https://`);
        setSaving(false);
        return;
      }
    }

    try {
      const res = await fetch(`/api/lessons/${lessonId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedTopics,
          taughtTopics,
          materials,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Erro ao salvar diário de aula.');
      }

      setDiary(json.lesson);
      setPlannedTopics(json.lesson.plannedTopics || []);
      setTaughtTopics(json.lesson.taughtTopics || []);
      setMaterials(json.lesson.materials || []);
      setSuccessMessage('Diário de aula salvo com sucesso no banco de dados!');

      if (onSaved) {
        onSaved();
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 4000);
    } catch (err: any) {
      setError(err.message || 'Erro ao persistir alterações.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800/90 to-slate-900 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-widest uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/30 px-2.5 py-0.5 rounded-full">
                  Diário de Aula &bull; MVP
                </span>
                {diary && (
                  <span className="text-xs text-slate-400 font-mono">
                    {diary.className} ({diary.classCode})
                  </span>
                )}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-1">
                {diary ? `Aula ${diary.lessonNumber} — ${diary.title}` : 'Carregando aula...'}
              </h2>
              {diary && (
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1.5">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    {new Date(diary.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-cyan-400" />
                    {diary.scheduleTime}
                  </span>
                  <span>&bull;</span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-cyan-400" />
                    {diary.teacherName}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={refreshDiary}
                disabled={loading}
                title="Recarregar dados do servidor"
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Sub-Navigation Tabs */}
          <div className="flex items-center gap-1.5 mt-5 p-1 bg-slate-950/60 border border-slate-800 rounded-2xl overflow-x-auto">
            <button
              onClick={() => setActiveSection('planned')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'planned'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>A. Tópicos Planejados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeSection === 'planned' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                {plannedTopics.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('taught')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'taught'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>B. Tópicos Ministrados</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeSection === 'taught' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                {taughtTopics.length}
              </span>
            </button>

            <button
              onClick={() => setActiveSection('materials')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap cursor-pointer ${
                activeSection === 'materials'
                  ? 'bg-cyan-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>C. Materiais de Apoio</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${activeSection === 'materials' ? 'bg-slate-950 text-cyan-300' : 'bg-slate-800 text-slate-300'}`}>
                {materials.length}
              </span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Carregando dados da aula no PostgreSQL...</span>
            </div>
          ) : (
            <>
              {/* ========================================================= */}
              {/* ÁREA A: TÓPICOS PLANEJADOS */}
              {/* ========================================================= */}
              {activeSection === 'planned' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        <span>O que vamos aprender &bull; Tópicos Previstos</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Defina o roteiro planejado para esta aula. Cada tópico pode ser editado ou excluído individualmente.
                      </p>
                    </div>
                  </div>

                  {/* Add Input */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newPlannedTopic}
                        onChange={(e) => setNewPlannedTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddPlannedTopic()}
                        placeholder="Ex: 1. O que é herança, A palavra extends..."
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        onClick={handleAddPlannedTopic}
                        className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-3.5 py-2 text-xs font-bold text-slate-950 shrink-0 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  )}

                  {/* List of Planned Topics */}
                  {plannedTopics.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-800">
                      Nenhum tópico planejado cadastrado para esta aula.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {plannedTopics.map((topic, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs transition-colors hover:border-slate-700 gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-400 font-mono font-bold text-[11px]">
                              {idx + 1}
                            </span>
                            {editingPlannedIndex === idx ? (
                              <input
                                type="text"
                                value={editingPlannedValue}
                                onChange={(e) => setEditingPlannedValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEditPlanned(idx)}
                                className="flex-1 rounded-lg border border-cyan-500/60 bg-slate-900 px-2.5 py-1 text-xs text-white focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="text-slate-200 font-medium leading-relaxed truncate">
                                {topic}
                              </span>
                            )}
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {editingPlannedIndex === idx ? (
                                <button
                                  onClick={() => handleSaveEditPlanned(idx)}
                                  className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                                  title="Salvar alteração"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingPlannedIndex(idx);
                                    setEditingPlannedValue(topic);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                                  title="Editar tópico"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemovePlannedTopic(idx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                title="Remover tópico"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* ÁREA B: TÓPICOS MINISTRADOS */}
              {/* ========================================================= */}
              {activeSection === 'taught' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>O que aprendemos &bull; Conteúdo Efetivamente Ministrado</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Registre o que realmente foi trabalhado em sala de aula após o término da aula. O planejado e o realizado são independentes.
                      </p>
                    </div>

                    {!isReadOnly && plannedTopics.length > 0 && taughtTopics.length === 0 && (
                      <button
                        onClick={handleCopyPlannedToTaught}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-800/80 text-xs font-semibold text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all cursor-pointer shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Usar planejado como base</span>
                      </button>
                    )}
                  </div>

                  {/* Add Input */}
                  {!isReadOnly && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={newTaughtTopic}
                        onChange={(e) => setNewTaughtTopic(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTaughtTopic()}
                        placeholder="Ex: Exercício prático com classes Pessoa e Aluno..."
                        className="flex-1 rounded-xl border border-slate-800 bg-slate-950/80 px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                      <button
                        onClick={handleAddTaughtTopic}
                        className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-3.5 py-2 text-xs font-bold text-slate-950 shrink-0 transition-all cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  )}

                  {/* List of Taught Topics */}
                  {taughtTopics.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-800">
                      Nenhum tópico ministrado registrado ainda. Os tópicos ministrados só aparecerão para o aluno após o registro.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {taughtTopics.map((topic, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 rounded-xl border border-slate-800/80 bg-slate-950/60 text-xs transition-colors hover:border-slate-700 gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-400 font-mono font-bold text-[11px]">
                              {idx + 1}
                            </span>
                            {editingTaughtIndex === idx ? (
                              <input
                                type="text"
                                value={editingTaughtValue}
                                onChange={(e) => setEditingTaughtValue(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSaveEditTaught(idx)}
                                className="flex-1 rounded-lg border border-emerald-500/60 bg-slate-900 px-2.5 py-1 text-xs text-white focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <span className="text-slate-200 font-medium leading-relaxed truncate">
                                {topic}
                              </span>
                            )}
                          </div>

                          {!isReadOnly && (
                            <div className="flex items-center gap-1.5 shrink-0">
                              {editingTaughtIndex === idx ? (
                                <button
                                  onClick={() => handleSaveEditTaught(idx)}
                                  className="p-1 rounded-lg text-emerald-400 hover:bg-emerald-500/10"
                                  title="Salvar alteração"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingTaughtIndex(idx);
                                    setEditingTaughtValue(topic);
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800"
                                  title="Editar tópico"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                              <button
                                onClick={() => handleRemoveTaughtTopic(idx)}
                                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                title="Remover tópico"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ========================================================= */}
              {/* ÁREA C: MATERIAIS DE APOIO (LINKS EXTERNOS) */}
              {/* ========================================================= */}
              {activeSection === 'materials' && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <ExternalLink className="w-4 h-4 text-cyan-400" />
                        <span>Materiais de Apoio &bull; Links Externos</span>
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Disponibilize links para GitHub, Google Drive, Documentação oficial, YouTube, etc. Exclusivamente links HTTP/HTTPS.
                      </p>
                    </div>
                  </div>

                  {/* Add Material Form */}
                  {!isReadOnly && (
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                      <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                        Cadastrar Novo Link Externo
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Título do Material *</label>
                          <input
                            type="text"
                            value={newMaterialTitle}
                            onChange={(e) => setNewMaterialTitle(e.target.value)}
                            placeholder="Ex: Código da aula — GitHub"
                            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">URL (http:// ou https://) *</label>
                          <input
                            type="url"
                            value={newMaterialUrl}
                            onChange={(e) => setNewMaterialUrl(e.target.value)}
                            placeholder="https://github.com/..."
                            className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Descrição Opcional</label>
                        <input
                          type="text"
                          value={newMaterialDescription}
                          onChange={(e) => setNewMaterialDescription(e.target.value)}
                          placeholder="Ex: Repositório com as classes e exemplos de herança"
                          className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={handleAddMaterial}
                          className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 transition-all cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Adicionar Link</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* List of Materials */}
                  {materials.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500 rounded-2xl border border-dashed border-slate-800">
                      Nenhum material de apoio cadastrado para esta aula.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {materials.map((mat, idx) => (
                        <div
                          key={mat.id || idx}
                          className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 text-xs transition-colors hover:border-slate-700 space-y-2"
                        >
                          {editingMaterialIndex === idx ? (
                            <div className="space-y-2.5">
                              <input
                                type="text"
                                value={editingMaterialTitle}
                                onChange={(e) => setEditingMaterialTitle(e.target.value)}
                                placeholder="Título"
                                className="w-full rounded-lg border border-cyan-500/60 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              />
                              <input
                                type="url"
                                value={editingMaterialUrl}
                                onChange={(e) => setEditingMaterialUrl(e.target.value)}
                                placeholder="URL"
                                className="w-full rounded-lg border border-cyan-500/60 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              />
                              <input
                                type="text"
                                value={editingMaterialDescription}
                                onChange={(e) => setEditingMaterialDescription(e.target.value)}
                                placeholder="Descrição opcional"
                                className="w-full rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1.5 text-xs text-white focus:outline-none"
                              />
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setEditingMaterialIndex(null)}
                                  className="px-3 py-1 rounded-lg border border-slate-800 text-slate-400 hover:text-white"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEditMaterial(idx)}
                                  className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-start justify-between gap-3">
                              <div className="space-y-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <LinkIcon className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                  <h4 className="font-bold text-white text-sm truncate">{mat.title}</h4>
                                </div>
                                {mat.description && (
                                  <p className="text-slate-400 text-xs">{mat.description}</p>
                                )}
                                <div className="pt-1">
                                  <a
                                    href={mat.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 hover:underline"
                                  >
                                    <span className="truncate max-w-md">{mat.url}</span>
                                    <ExternalLink className="w-3 h-3 shrink-0" />
                                  </a>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <a
                                  href={mat.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors"
                                >
                                  <span>Abrir</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>

                                {!isReadOnly && (
                                  <>
                                    <button
                                      onClick={() => {
                                        setEditingMaterialIndex(idx);
                                        setEditingMaterialTitle(mat.title);
                                        setEditingMaterialUrl(mat.url);
                                        setEditingMaterialDescription(mat.description || '');
                                      }}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-cyan-300 hover:bg-slate-800"
                                      title="Editar material"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveMaterial(idx)}
                                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10"
                                      title="Remover material"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with Persistent Save Button */}
        <div className="p-4 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Fechar
          </button>

          {!isReadOnly && (
            <button
              onClick={handleSaveDiary}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer disabled:opacity-60"
            >
              {saving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Salvando no PostgreSQL...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Alterações do Diário</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
