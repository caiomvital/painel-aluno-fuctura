'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  GraduationCap,
  School,
  Layers,
  Plus,
  Settings,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Save,
  Zap,
  TrendingUp,
  Sliders,
  Shield,
  BookOpen,
  FileText,
  Gavel,
  Trash2,
  Edit3,
  Search,
  Flame,
  Tag,
  Sparkles,
  X,
  Check,
  Award,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { StudentAttendanceModal } from '@/components/attendance/StudentAttendanceModal';
import { AuctionItem, AuctionGlobalSettings } from '@/lib/auctionStore';
import { LessonDiaryModal } from '@/components/lessons/LessonDiaryModal';

export const DEFAULT_DIRECTOR_DASHBOARD_MOCK = {
  director: {
    id: 'dir_1',
    name: 'Carlos Mendes',
    title: 'Diretor Geral e Pedagógico',
  },
  metrics: {
    totalStudents: 15,
    totalTeachers: 2,
    totalCourses: 2,
    totalClasses: 2,
  },
  classes: [
    {
      id: 'class_1',
      name: 'Java Fullstack - Turma Sábado',
      code: 'JAVA-SAB-2026.1',
      courseName: 'Formação Java Fullstack',
      teacherName: 'Prof. Henrique Silveira',
      daysOfWeek: 'SAB',
      scheduleTime: '08:30 - 12:30',
      lessonsPerWeek: 1,
      status: 'ACTIVE',
      enrolledCount: 15,
    },
    {
      id: 'class_2',
      name: 'Python Data Science - Noturno',
      code: 'PY-NOT-2026.1',
      courseName: 'Formação Python & Data Science',
      teacherName: 'Profa. Renata Vasconcelos',
      daysOfWeek: 'TER,QUI',
      scheduleTime: '19:00 - 22:00',
      lessonsPerWeek: 2,
      status: 'ACTIVE',
      enrolledCount: 12,
    },
  ],
  courses: [
    {
      id: 'course_1',
      name: 'Academia Java Full Stack',
      code: 'JAVA-FS',
      workloadHours: 96,
      partnerCertification: 'Oracle Certified Alignment & Padrão Fuctura',
    },
    {
      id: 'course_2',
      name: 'Academia Python & Inteligência Artificial',
      code: 'PYTHON-FS',
      workloadHours: 96,
      partnerCertification: 'Python Institute Alignment & Padrão Fuctura',
    },
  ],
  teachers: [
    { id: 'teach_1', name: 'Prof. Henrique Silveira', email: 'henrique.silveira@fuctura.com.br', specialty: 'Especialista em Arquitetura Java & Spring', assignedClassesCount: 1, assignedClasses: ['Java Fullstack - Turma Sábado'] },
    { id: 'teach_2', name: 'Profa. Renata Vasconcelos', email: 'renata.vasconcelos@fuctura.com.br', specialty: 'Especialista em Python, Django & IA', assignedClassesCount: 1, assignedClasses: ['Python Data Science - Noturno'] },
  ],
  students: [
    {
      id: 'stud_1',
      name: 'João Pedro da Silva',
      email: 'aluno@fuctura.com.br',
      registrationNumber: 'FUC-2026-0891',
      className: 'Java Fullstack - Turma Sábado',
      currentXp: 1240,
      level: 4,
      streak: 7,
      attendanceRate: 100,
    },
    {
      id: 'stud_2',
      name: 'Mariana Costa',
      email: 'mariana.costa@gmail.com',
      registrationNumber: 'FUC-2026-0412',
      className: 'Java Fullstack - Turma Sábado',
      currentXp: 980,
      level: 3,
      streak: 5,
      attendanceRate: 92,
    },
    {
      id: 'stud_3',
      name: 'Lucas Andrade',
      email: 'lucas.andrade@gmail.com',
      registrationNumber: 'FUC-2026-0922',
      className: 'Python Data Science - Noturno',
      currentXp: 1150,
      level: 4,
      streak: 6,
      attendanceRate: 95,
    },
  ],
  gamificationRules: [
    { id: 'rule_1', code: 'XP_LOGIN', name: 'Login Diário no Portal', description: 'XP concedido ao aluno ao realizar o primeiro acesso do dia (máx 1x por dia)', xpValue: 5, isActive: true },
    { id: 'rule_2', code: 'XP_ATTENDANCE', name: 'Presença Confirmada em Aula', description: 'XP creditado quando o professor valida a presença do aluno em sala', xpValue: 50, isActive: true },
    { id: 'rule_3', code: 'XP_STREAK_BONUS', name: 'Bônus de Sequência (Streak)', description: 'XP extra a cada ciclo de 7 presenças consecutivas sem faltas', xpValue: 200, isActive: true },
  ],
};

export const DirectorView: React.FC = () => {
  const [data, setData] = useState<any>(DEFAULT_DIRECTOR_DASHBOARD_MOCK);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'auction' | 'students' | 'teachers' | 'classes' | 'gamification'>('auction');
  const [selectedClassForLessons, setSelectedClassForLessons] = useState<any | null>(null);
  const [selectedLessonForDiaryId, setSelectedLessonForDiaryId] = useState<string | null>(null);

  // Auction State
  const [auctionItems, setAuctionItems] = useState<AuctionItem[]>([]);
  const [auctionSettings, setAuctionSettings] = useState<AuctionGlobalSettings | null>(null);
  const [loadingAuction, setLoadingAuction] = useState(false);
  const [auctionSearch, setAuctionSearch] = useState('');

  // Modals for Auction
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<AuctionItem | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [itemFormData, setItemFormData] = useState({
    title: '',
    category: 'Equipamento' as 'Equipamento' | 'Mentoria' | 'Swag Oficial' | 'Certificação' | 'Livros',
    description: '',
    marketValue: 'R$ 0,00',
    minNextBid: 200,
    iconType: 'keyboard' as any,
    isFeatured: false,
    durationHours: 48,
  });

  // Modals for Students
  const [studentSearch, setStudentSearch] = useState('');
  const [showStudentModal, setShowStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any | null>(null);
  const [studentFormData, setStudentFormData] = useState({
    name: '',
    email: '',
    classId: '',
    registrationNumber: '',
    currentXp: 100,
    streak: 1,
  });

  // Modals for Teachers
  const [teacherSearch, setTeacherSearch] = useState('');
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<any | null>(null);
  const [teacherFormData, setTeacherFormData] = useState({
    name: '',
    email: '',
    specialty: '',
  });

  // Modals for Classes
  const [showClassModal, setShowClassModal] = useState(false);
  const [classFormData, setClassFormData] = useState({
    name: '',
    code: '',
    courseId: '',
    teacherId: '',
    daysOfWeek: 'SAB',
    scheduleTime: '08:30 - 12:30',
    durationMinutes: 240,
    lessonsPerWeek: 1,
    startDate: '2026-03-01',
  });

  // Feedback notifications
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);
  const [actionErrorMsg, setActionErrorMsg] = useState<string | null>(null);

  const showNotification = (msg: string, isError = false) => {
    if (isError) {
      setActionErrorMsg(msg);
      setTimeout(() => setActionErrorMsg(null), 4000);
    } else {
      setActionSuccessMsg(msg);
      setTimeout(() => setActionSuccessMsg(null), 4000);
    }
  };

  // Fetch Dashboard Data
  const loadDashboard = async () => {
    try {
      const res = await fetch('/api/director/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch {
      // keep fallback
    }
  };

  // Fetch Auction Data
  const loadAuction = async () => {
    try {
      const res = await fetch('/api/director/auction');
      if (res.ok) {
        const json = await res.json();
        setAuctionItems(json.items || []);
        setAuctionSettings(json.settings || null);
      }
    } catch (e) {
      console.error('Erro ao carregar leilão:', e);
    }
  };

  useEffect(() => {
    let isMounted = true;

    fetch('/api/director/dashboard')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json) {
          setData(json);
        }
      })
      .catch(() => {});

    fetch('/api/director/auction')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (isMounted && json) {
          if (json.items) setAuctionItems(json.items);
          if (json.settings) setAuctionSettings(json.settings);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  // ================= AUCTION ACTIONS =================
  const handleOpenCreateItem = () => {
    setEditingItem(null);
    setItemFormData({
      title: '',
      category: 'Equipamento',
      description: '',
      marketValue: 'R$ 350,00',
      minNextBid: 300,
      iconType: 'keyboard',
      isFeatured: false,
      durationHours: 48,
    });
    setShowItemModal(true);
  };

  const handleOpenEditItem = (item: AuctionItem) => {
    setEditingItem(item);
    setItemFormData({
      title: item.title,
      category: item.category,
      description: item.description,
      marketValue: item.marketValue,
      minNextBid: item.minNextBid,
      iconType: item.iconType,
      isFeatured: !!item.isFeatured,
      durationHours: Math.round(item.endsInSeconds / 3600) || 24,
    });
    setShowItemModal(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingItem) {
        // Update
        const res = await fetch('/api/director/auction', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingItem.id,
            title: itemFormData.title,
            category: itemFormData.category,
            description: itemFormData.description,
            marketValue: itemFormData.marketValue,
            minNextBid: Number(itemFormData.minNextBid),
            iconType: itemFormData.iconType,
            isFeatured: itemFormData.isFeatured,
            endsInSeconds: itemFormData.durationHours * 3600,
          }),
        });
        if (!res.ok) throw new Error('Falha ao atualizar item.');
        showNotification('Item do leilão atualizado com sucesso!');
      } else {
        // Create
        const res = await fetch('/api/director/auction', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: itemFormData.title,
            category: itemFormData.category,
            description: itemFormData.description,
            marketValue: itemFormData.marketValue,
            minNextBid: Number(itemFormData.minNextBid),
            iconType: itemFormData.iconType,
            isFeatured: itemFormData.isFeatured,
            endsInSeconds: itemFormData.durationHours * 3600,
          }),
        });
        if (!res.ok) throw new Error('Falha ao criar item no leilão.');
        showNotification('Novo item incluído no leilão com sucesso!');
      }
      setShowItemModal(false);
      loadAuction();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao salvar item.', true);
    }
  };

  const handleDeleteItem = async (id: string, title: string) => {
    if (!confirm(`Tem certeza que deseja remover o item "${title}" do leilão?`)) return;
    try {
      const res = await fetch(`/api/director/auction?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao remover item.');
      showNotification(`Item "${title}" removido com sucesso.`);
      loadAuction();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao remover item.', true);
    }
  };

  const handleSaveAuctionSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auctionSettings) return;
    try {
      const res = await fetch('/api/director/auction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_SETTINGS',
          seasonTitle: auctionSettings.seasonTitle,
          status: auctionSettings.status,
          endDate: auctionSettings.endDate,
          minBidIncrement: auctionSettings.minBidIncrement,
        }),
      });
      if (!res.ok) throw new Error('Falha ao atualizar configurações.');
      showNotification('Configurações e datas do leilão atualizadas com sucesso!');
      setShowSettingsModal(false);
      loadAuction();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao salvar configurações.', true);
    }
  };

  // ================= STUDENT ACTIONS =================
  const handleOpenCreateStudent = () => {
    setEditingStudent(null);
    setStudentFormData({
      name: '',
      email: '',
      classId: data.classes?.[0]?.id || '',
      registrationNumber: `FUC-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      currentXp: 300,
      streak: 1,
    });
    setShowStudentModal(true);
  };

  const handleOpenEditStudent = (stud: any) => {
    setEditingStudent(stud);
    setStudentFormData({
      name: stud.name,
      email: stud.email,
      classId: stud.classId || '',
      registrationNumber: stud.registrationNumber,
      currentXp: stud.currentXp,
      streak: stud.streak || 1,
    });
    setShowStudentModal(true);
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const res = await fetch('/api/director/students', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingStudent.id,
            name: studentFormData.name,
            email: studentFormData.email,
            classId: studentFormData.classId,
            registrationNumber: studentFormData.registrationNumber,
            currentXp: Number(studentFormData.currentXp),
            streak: Number(studentFormData.streak),
          }),
        });
        if (!res.ok) throw new Error('Erro ao atualizar aluno.');
        showNotification('Dados e pontuação do aluno atualizados!');
      } else {
        const res = await fetch('/api/director/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(studentFormData),
        });
        if (!res.ok) throw new Error('Erro ao matricular aluno.');
        showNotification('Novo aluno matriculado com sucesso!');
      }
      setShowStudentModal(false);
      loadDashboard();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao processar aluno.', true);
    }
  };

  const handleDeleteStudent = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o aluno "${name}" do sistema? Essa ação removerá a matrícula e o histórico.`)) return;
    try {
      const res = await fetch(`/api/director/students?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover aluno.');
      showNotification(`Aluno "${name}" removido com sucesso.`);
      loadDashboard();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao remover aluno.', true);
    }
  };

  // ================= TEACHER ACTIONS =================
  const handleOpenCreateTeacher = () => {
    setEditingTeacher(null);
    setTeacherFormData({
      name: '',
      email: '',
      specialty: 'Instrutor de Java / Python & Fullstack',
    });
    setShowTeacherModal(true);
  };

  const handleOpenEditTeacher = (teach: any) => {
    setEditingTeacher(teach);
    setTeacherFormData({
      name: teach.name,
      email: teach.email,
      specialty: teach.specialty || '',
    });
    setShowTeacherModal(true);
  };

  const handleSaveTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTeacher) {
        const res = await fetch('/api/director/teachers', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingTeacher.id,
            name: teacherFormData.name,
            email: teacherFormData.email,
            specialty: teacherFormData.specialty,
          }),
        });
        if (!res.ok) throw new Error('Erro ao atualizar professor.');
        showNotification('Dados do professor atualizados com sucesso!');
      } else {
        const res = await fetch('/api/director/teachers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(teacherFormData),
        });
        if (!res.ok) throw new Error('Erro ao cadastrar professor.');
        showNotification('Novo professor cadastrado na Fuctura!');
      }
      setShowTeacherModal(false);
      loadDashboard();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao processar professor.', true);
    }
  };

  const handleDeleteTeacher = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover o professor "${name}"?`)) return;
    try {
      const res = await fetch(`/api/director/teachers?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover professor.');
      showNotification(`Professor "${name}" removido com sucesso.`);
      loadDashboard();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao remover professor.', true);
    }
  };

  // ================= CLASS ACTIONS =================
  const handleSaveClass = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/director/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classFormData),
      });
      if (!res.ok) throw new Error('Erro ao criar turma.');
      showNotification('Nova turma criada com sucesso!');
      setShowClassModal(false);
      loadDashboard();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao criar turma.', true);
    }
  };

  const handleDeleteClass = async (id: string, name: string) => {
    if (!confirm(`Tem certeza que deseja remover a turma "${name}"? As matrículas e aulas vinculadas serão desfeitas.`)) return;
    try {
      const res = await fetch(`/api/director/classes?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erro ao remover turma.');
      showNotification(`Turma "${name}" removida com sucesso.`);
      loadDashboard();
    } catch (err: any) {
      showNotification(err.message || 'Erro ao remover turma.', true);
    }
  };

  // Filtered lists
  const filteredAuctionItems = auctionItems.filter((i) =>
    i.title.toLowerCase().includes(auctionSearch.toLowerCase()) ||
    i.category.toLowerCase().includes(auctionSearch.toLowerCase())
  );

  const filteredStudents = (data.students || []).filter((s: any) =>
    s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.registrationNumber.toLowerCase().includes(studentSearch.toLowerCase()) ||
    s.email.toLowerCase().includes(studentSearch.toLowerCase())
  );

  const filteredTeachers = (data.teachers || []).filter((t: any) =>
    t.name.toLowerCase().includes(teacherSearch.toLowerCase()) ||
    (t.specialty || '').toLowerCase().includes(teacherSearch.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      {/* Toast Notification */}
      {actionSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/90 px-5 py-3.5 text-xs font-bold text-emerald-200 shadow-2xl backdrop-blur-md animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}
      {actionErrorMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-rose-500/40 bg-rose-950/90 px-5 py-3.5 text-xs font-bold text-rose-200 shadow-2xl backdrop-blur-md">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{actionErrorMsg}</span>
        </div>
      )}

      {/* 1. Header Hero do Diretor (Visão Geral de Admin) */}
      <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-br from-slate-900 via-slate-900 to-[#0b1329] p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 h-56 w-56 bg-gradient-to-br from-amber-500/10 via-cyan-500/10 to-indigo-600/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-[11px] font-black text-amber-400 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2.5 py-0.5 rounded-full">
                👑 Painel do Diretor &bull; Administrador Geral
              </span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs text-slate-300 font-semibold">Fuctura Tecnologia</span>
              <span className="text-slate-600">&bull;</span>
              <span className="text-xs text-slate-400">Recife - PE &bull; Espinheiro</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Olá, {data.director?.name || 'Carlos Mendes'}.
            </h1>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Você tem permissão total de administrador: inclua ou remova qualquer <strong>aluno</strong>, <strong>professor</strong>, <strong>lotes do leilão</strong>, <strong>datas de encerramento</strong> e <strong>turmas</strong>.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
            <div className="rounded-2xl border border-cyan-500/20 bg-slate-950/60 p-3 text-center backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block font-semibold">Alunos</span>
              <span className="font-mono text-xl font-black text-cyan-400">
                {data.students ? data.students.length : data.metrics?.totalStudents || 15}
              </span>
            </div>
            <div className="rounded-2xl border border-emerald-500/20 bg-slate-950/60 p-3 text-center backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block font-semibold">Professores</span>
              <span className="font-mono text-xl font-black text-emerald-400">
                {data.teachers ? data.teachers.length : data.metrics?.totalTeachers || 2}
              </span>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-slate-950/60 p-3 text-center backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block font-semibold">Lotes Leilão</span>
              <span className="font-mono text-xl font-black text-amber-400">
                {auctionItems.length}
              </span>
            </div>
            <div className="rounded-2xl border border-indigo-500/20 bg-slate-950/60 p-3 text-center backdrop-blur-sm">
              <span className="text-[10px] text-slate-400 block font-semibold">Turmas</span>
              <span className="font-mono text-xl font-black text-indigo-400">
                {data.classes?.length || 2}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Abas de Gestão do Administrador */}
      <div className="flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-x-auto shadow-lg">
        <button
          onClick={() => setActiveTab('auction')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'auction'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Gavel className="w-4 h-4 text-amber-400" />
          <span>Gestão do Leilão &amp; Lotes</span>
          <span className="ml-1 rounded-full bg-amber-400/20 px-1.5 py-0.2 text-[10px] font-black text-amber-300">
            {auctionItems.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'students'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          <span>Alunos ({data.students?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('teachers')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'teachers'
              ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <School className="w-4 h-4" />
          <span>Professores ({data.teachers?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'classes'
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20 font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Turmas &amp; Aulas ({data.classes?.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('gamification')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
            activeTab === 'gamification'
              ? 'bg-slate-100 text-slate-950 shadow-md font-black'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Regras de XP</span>
        </button>
      </div>

      {/* ========================================================
          ABA 1: GESTÃO DO LEILÃO (INCLUIR/REMOVER ITENS E DATAS)
         ======================================================== */}
      {activeTab === 'auction' && (
        <div className="space-y-6">
          {/* Banner de Controle da Temporada & Datas do Leilão */}
          <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-slate-900 p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="flex h-2.5 w-2.5 rounded-full bg-amber-400 animate-ping" />
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
                  Status do Leilão Oficial
                </span>
                <span className="text-slate-600">&bull;</span>
                <span className="text-xs font-mono font-bold text-slate-200">
                  {auctionSettings?.seasonTitle || 'Temporada Oficial Fuctura Tech'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Status atual:{' '}
                  <strong className="text-emerald-400 uppercase font-black">
                    {auctionSettings?.status === 'ACTIVE' ? 'Ativo (Disputa Aberta)' : 'Pausado / Encerrado'}
                  </strong>
                </span>
                <span>&bull;</span>
                <span>
                  Incremento Mínimo por Lance: <strong>{auctionSettings?.minBidIncrement || 50} XP</strong>
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={() => setShowSettingsModal(true)}
                className="flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2.5 text-xs font-bold text-amber-300 transition-all active:scale-95"
              >
                <Calendar className="w-4 h-4" />
                <span>Configurar Datas &amp; Status</span>
              </button>

              <button
                onClick={handleOpenCreateItem}
                className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 px-5 py-2.5 text-xs font-black text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Incluir Novo Item no Leilão</span>
              </button>
            </div>
          </div>

          {/* Search & Counter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Filtrar por prêmio ou categoria..."
                value={auctionSearch}
                onChange={(e) => setAuctionSearch(e.target.value)}
                className="w-full rounded-2xl border border-slate-800 bg-slate-900/80 py-2.5 pl-10 pr-4 text-xs text-white placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>
            <span className="text-xs text-slate-400">
              Exibindo <strong>{filteredAuctionItems.length}</strong> de <strong>{auctionItems.length}</strong> lotes disponíveis
            </span>
          </div>

          {/* Grid de Itens do Leilão */}
          {filteredAuctionItems.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/50 p-12 text-center">
              <Gavel className="w-12 h-12 text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white">Nenhum lote encontrado</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Não há itens correspondentes aos termos filtrados ou ainda não há lotes cadastrados.
              </p>
              <button
                onClick={handleOpenCreateItem}
                className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Primeiro Lote</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredAuctionItems.map((item) => (
                <div
                  key={item.id}
                  className={`rounded-3xl border p-5 flex flex-col justify-between backdrop-blur-md shadow-xl transition-all hover:border-slate-700 ${
                    item.isFeatured
                      ? 'border-amber-500/40 bg-gradient-to-b from-amber-500/5 via-slate-900/80 to-slate-950'
                      : 'border-slate-800/80 bg-slate-900/60'
                  }`}
                >
                  <div>
                    {/* Top Row: Category + Actions */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-lg">
                          {item.category}
                        </span>
                        {item.isFeatured && (
                          <span className="text-[9px] font-black text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg">
                            ⭐ Destaque
                          </span>
                        )}
                      </div>

                      {/* Admin Actions: Edit & Delete */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditItem(item)}
                          className="p-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-slate-300 hover:text-white hover:border-amber-400/50 hover:bg-amber-500/10 transition-colors"
                          title="Editar item do leilão"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id, item.title)}
                          className="p-1.5 rounded-xl border border-slate-700/80 bg-slate-800/80 text-rose-400 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
                          title="Remover do leilão"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-white leading-snug line-clamp-2">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed line-clamp-3">
                      {item.description}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-slate-800/80 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 block">Maior Lance Atual</span>
                        <div className="flex items-center gap-1 text-amber-400 font-mono font-bold text-sm">
                          <Zap className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{item.currentBid} XP</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Valor Comercial</span>
                        <span className="text-xs font-semibold text-slate-300">{item.marketValue}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/60 px-3 py-2 rounded-xl border border-slate-800/60">
                      <span>Licitante: <strong className="text-slate-200">{item.highestBidder}</strong></span>
                      <span className="font-mono text-cyan-400">{item.totalBids} lances</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleOpenEditItem(item)}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Editar Lote / Datas</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ABA 2: GESTÃO DE ALUNOS (INCLUIR/EDITAR/REMOVER/AJUSTAR XP)
         ======================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
            <div className="w-full sm:w-auto">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" />
                <span>Base Geral de Alunos Matriculados</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Controle de matrículas, acompanhamento de frequência e ajuste manual de pontuação XP.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar aluno ou matrícula..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <button
                onClick={handleOpenCreateStudent}
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 px-4 py-2 text-xs font-bold text-slate-950 shrink-0 shadow-md shadow-cyan-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Matricular Aluno</span>
              </button>
            </div>
          </div>

          {/* Students Table */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/70 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-[11px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3.5 px-4">Aluno</th>
                    <th className="py-3.5 px-4">Matrícula</th>
                    <th className="py-3.5 px-4">Turma Atribuída</th>
                    <th className="py-3.5 px-4">Pontuação XP</th>
                    <th className="py-3.5 px-4">Aulas Seguidas</th>
                    <th className="py-3.5 px-4">Presença</th>
                    <th className="py-3.5 px-4 text-right">Ações de Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredStudents.map((st: any) => (
                    <tr key={st.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{st.name}</div>
                        <div className="text-[11px] text-slate-500">{st.email}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-400 font-semibold text-[11px]">
                        {st.registrationNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block rounded-lg bg-slate-800 px-2 py-1 text-[11px] font-medium text-slate-200">
                          {st.className || 'Sem turma'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 font-mono font-bold text-amber-400">
                          <Zap className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{st.currentXp} XP</span>
                        </div>
                        <span className="text-[10px] text-slate-500">Nível {st.level || Math.floor(st.currentXp / 300) + 1}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-emerald-400 font-bold font-mono">
                          <Flame className="w-3.5 h-3.5 fill-emerald-400" />
                          <span>{st.streak || 0} aulas</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-emerald-400">{st.attendanceRate || 100}%</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditStudent(st)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-cyan-400/50 hover:bg-cyan-500/10 transition-colors"
                            title="Editar aluno ou ajustar XP"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(st.id, st.name)}
                            className="p-1.5 rounded-lg border border-slate-700 bg-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
                            title="Remover matrícula"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 3: GESTÃO DE PROFESSORES (INCLUIR/EDITAR/REMOVER)
         ======================================================== */}
      {activeTab === 'teachers' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-400" />
                <span>Corpo Docente Fuctura Tecnologia</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Instrutores responsáveis pelas turmas, lançamento de presenças e acompanhamento prático.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar professor..."
                  value={teacherSearch}
                  onChange={(e) => setTeacherSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 py-2 pl-9 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <button
                onClick={handleOpenCreateTeacher}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-4 py-2 text-xs font-bold text-slate-950 shrink-0 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Contratar Professor</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTeachers.map((tc: any) => (
              <div
                key={tc.id}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 flex flex-col justify-between backdrop-blur-md shadow-xl hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg">
                      Instrutor Oficial
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTeacher(tc)}
                        className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:border-emerald-400/50 hover:bg-emerald-500/10 transition-colors"
                        title="Editar professor"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTeacher(tc.id, tc.name)}
                        className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
                        title="Remover professor"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-white">{tc.name}</h3>
                  <div className="text-xs text-slate-400 font-mono mt-0.5">{tc.email}</div>
                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                    {tc.specialty || 'Especialista em Tecnologia Fuctura'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Turmas Atribuídas:</span>
                  <span className="font-bold text-white font-mono bg-slate-800 px-2.5 py-0.5 rounded-lg border border-slate-700">
                    {tc.assignedClassesCount !== undefined ? tc.assignedClassesCount : 1}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          ABA 4: GESTÃO DE TURMAS & AULAS
         ======================================================== */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-3xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Turmas Oficiais da Fuctura Tecnologia</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Crie e configure horários, frequência semanal e professor responsável por cada turma.
              </p>
            </div>

            <button
              onClick={() => setShowClassModal(true)}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 px-4 py-2 text-xs font-bold text-white shrink-0 shadow-md shadow-indigo-500/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova Turma</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(data.classes || []).map((cls: any) => (
              <div
                key={cls.id}
                className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-5 flex flex-col justify-between backdrop-blur-md shadow-xl"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-lg">
                      {cls.code}
                    </span>
                    <button
                      onClick={() => handleDeleteClass(cls.id, cls.name)}
                      className="p-1.5 rounded-xl border border-slate-700 bg-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/50 hover:bg-rose-500/10 transition-colors"
                      title="Excluir turma"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white">{cls.name}</h3>
                  <div className="text-xs text-slate-400 mt-1">Curso: {cls.courseName}</div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Horário / Dias</span>
                      <strong className="text-slate-200">{cls.daysOfWeek} &bull; {cls.scheduleTime}</strong>
                    </div>
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                      <span className="text-[10px] text-slate-500 block">Professor Responsável</span>
                      <strong className="text-cyan-300">{cls.teacherName || 'A definir'}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                  <span>Alunos: <strong className="text-white font-mono">{cls.enrolledCount || 0}</strong></span>
                  <button
                    onClick={() => setSelectedClassForLessons(cls)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-bold transition-all cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Diário de Aulas ({cls.lessons?.length || 0})</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Modal de Aulas da Turma para Diretoria */}
          {selectedClassForLessons && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md overflow-y-auto">
              <div className="relative w-full max-w-4xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl p-6 space-y-5 my-8 max-h-[90vh] flex flex-col">
                <div className="flex items-start justify-between pb-4 border-b border-slate-800 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-0.5 rounded-full">
                        Diário de Turma &bull; Diretoria
                      </span>
                      <span className="text-xs text-slate-400 font-mono">{selectedClassForLessons.code}</span>
                    </div>
                    <h3 className="text-xl font-bold text-white mt-1">{selectedClassForLessons.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Professor Responsável: <strong className="text-cyan-300 font-medium">{selectedClassForLessons.teacherName || 'Não atribuído'}</strong> &bull; {selectedClassForLessons.daysOfWeek} ({selectedClassForLessons.scheduleTime})
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedClassForLessons(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="overflow-y-auto space-y-3 flex-1 pr-1">
                  {(selectedClassForLessons.lessons || []).length === 0 ? (
                    <div className="p-8 text-center text-xs text-slate-400">
                      Nenhuma aula registrada nesta turma.
                    </div>
                  ) : (
                    selectedClassForLessons.lessons.map((lesson: any) => (
                      <div
                        key={lesson.id}
                        className="p-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 text-xs hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded text-[11px]">
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

                          <div className="flex flex-wrap items-center gap-2.5 text-slate-400 text-xs">
                            <span>
                              {new Date(lesson.date).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
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
                          className="flex items-center justify-center gap-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-3.5 py-2 text-xs transition-all shrink-0 cursor-pointer shadow-md self-start sm:self-center"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>Inspecionar / Editar Diário</span>
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-end shrink-0">
                  <button
                    onClick={() => setSelectedClassForLessons(null)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          ABA 5: REGRAS DE GAMIFICAÇÃO & XP
         ======================================================== */}
      {activeTab === 'gamification' && (
        <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-6 backdrop-blur-md space-y-4">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400 fill-amber-400" />
              <span>Valores de Recompensa em XP</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Defina o peso de cada ação dos alunos para o cálculo de pontuação no ranking e lances do leilão.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {(data.gamificationRules || []).map((rule: any) => (
              <div key={rule.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-2">
                <span className="font-mono text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  {rule.code}
                </span>
                <h4 className="text-xs font-bold text-white">{rule.name}</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">{rule.description}</p>
                <div className="pt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-400">XP Concedido:</span>
                  <span className="font-mono font-bold text-amber-400 text-sm">+{rule.xpValue} XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CRIAR / EDITAR ITEM DO LEILÃO
         ======================================================== */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Gavel className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {editingItem ? 'Editar Lote do Leilão' : 'Incluir Novo Item no Leilão'}
                </h3>
              </div>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título do Prêmio / Lote</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Teclado Mecânico Keychron K2 RGB"
                  value={itemFormData.title}
                  onChange={(e) => setItemFormData({ ...itemFormData, title: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Categoria</label>
                  <select
                    value={itemFormData.category}
                    onChange={(e) => setItemFormData({ ...itemFormData, category: e.target.value as any })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  >
                    <option value="Equipamento">Equipamento</option>
                    <option value="Mentoria">Mentoria</option>
                    <option value="Swag Oficial">Swag Oficial</option>
                    <option value="Certificação">Certificação</option>
                    <option value="Livros">Livros</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Valor Comercial (R$)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: R$ 680,00"
                    value={itemFormData.marketValue}
                    onChange={(e) => setItemFormData({ ...itemFormData, marketValue: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Lance Mínimo Inicial (XP)</label>
                  <input
                    type="number"
                    required
                    min={50}
                    step={10}
                    value={itemFormData.minNextBid}
                    onChange={(e) => setItemFormData({ ...itemFormData, minNextBid: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Duração do Leilão (Horas)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={itemFormData.durationHours}
                    onChange={(e) => setItemFormData({ ...itemFormData, durationHours: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Descrição Detalhada do Item</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Descreva as especificações técnicas, condições de entrega ou agendamento..."
                  value={itemFormData.description}
                  onChange={(e) => setItemFormData({ ...itemFormData, description: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-600 focus:border-amber-400 focus:outline-none leading-relaxed"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="featuredCheck"
                  checked={itemFormData.isFeatured}
                  onChange={(e) => setItemFormData({ ...itemFormData, isFeatured: e.target.checked })}
                  className="rounded border-slate-700 bg-slate-950 text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="featuredCheck" className="text-slate-300 text-xs font-medium cursor-pointer">
                  Destacar este prêmio nos Flashcards do Hero principal
                </label>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20"
                >
                  {editingItem ? 'Salvar Alterações' : 'Cadastrar no Leilão'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CONFIGURAÇÃO DE DATAS GLOBAIS DO LEILÃO
         ======================================================== */}
      {showSettingsModal && auctionSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Configurar Datas do Leilão</h3>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAuctionSettings} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Título da Temporada</label>
                <input
                  type="text"
                  required
                  value={auctionSettings.seasonTitle}
                  onChange={(e) => setAuctionSettings({ ...auctionSettings, seasonTitle: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Status da Disputa</label>
                <select
                  value={auctionSettings.status}
                  onChange={(e) => setAuctionSettings({ ...auctionSettings, status: e.target.value as any })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                >
                  <option value="ACTIVE">Ativo (Permitir lances normalmente)</option>
                  <option value="PAUSED">Pausado temporariamente</option>
                  <option value="FINISHED">Encerrado (Arremates finais)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Data / Hora de Encerramento (ISO)</label>
                <input
                  type="datetime-local"
                  required
                  value={auctionSettings.endDate ? auctionSettings.endDate.slice(0, 16) : ''}
                  onChange={(e) => setAuctionSettings({ ...auctionSettings, endDate: new Date(e.target.value).toISOString() })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Ao atingir este horário, o sistema encerra automaticamente os lances.
                </span>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Incremento Mínimo por Lance (XP)</label>
                <input
                  type="number"
                  required
                  min={10}
                  step={10}
                  value={auctionSettings.minBidIncrement}
                  onChange={(e) => setAuctionSettings({ ...auctionSettings, minBidIncrement: Number(e.target.value) })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-500 hover:bg-amber-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-amber-500/20"
                >
                  Salvar Datas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: MATRICULAR / EDITAR ALUNO (E AJUSTAR XP)
         ======================================================== */}
      {showStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  {editingStudent ? 'Editar Aluno / Ajustar XP' : 'Matricular Novo Aluno'}
                </h3>
              </div>
              <button
                onClick={() => setShowStudentModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Oliveira"
                  value={studentFormData.name}
                  onChange={(e) => setStudentFormData({ ...studentFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail do Aluno</label>
                <input
                  type="email"
                  required
                  placeholder="aluno@fuctura.com.br"
                  value={studentFormData.email}
                  onChange={(e) => setStudentFormData({ ...studentFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Matrícula</label>
                  <input
                    type="text"
                    required
                    value={studentFormData.registrationNumber}
                    onChange={(e) => setStudentFormData({ ...studentFormData, registrationNumber: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-cyan-400 focus:border-cyan-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Turma</label>
                  <select
                    value={studentFormData.classId}
                    onChange={(e) => setStudentFormData({ ...studentFormData, classId: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-cyan-400 focus:outline-none"
                  >
                    <option value="">Sem turma</option>
                    {(data.classes || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-2xl border border-slate-800">
                <div>
                  <label className="block text-amber-300 font-semibold mb-1">Saldo XP do Aluno</label>
                  <input
                    type="number"
                    required
                    step={10}
                    value={studentFormData.currentXp}
                    onChange={(e) => setStudentFormData({ ...studentFormData, currentXp: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-amber-400 font-bold focus:border-amber-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Usado para lances no leilão</span>
                </div>

                <div>
                  <label className="block text-emerald-300 font-semibold mb-1">Aulas Seguidas (Streak)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={studentFormData.streak}
                    onChange={(e) => setStudentFormData({ ...studentFormData, streak: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 font-mono text-emerald-400 font-bold focus:border-emerald-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-500 mt-0.5 block">Sequência de presenças</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowStudentModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-cyan-500 hover:bg-cyan-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-cyan-500/20"
                >
                  {editingStudent ? 'Salvar Dados' : 'Concluir Matrícula'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CADASTRAR / EDITAR PROFESSOR
         ======================================================== */}
      {showTeacherModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <School className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  {editingTeacher ? 'Editar Professor' : 'Cadastrar Novo Professor'}
                </h3>
              </div>
              <button
                onClick={() => setShowTeacherModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacher} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Prof. Roberto Albuquerque"
                  value={teacherFormData.name}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">E-mail Institucional</label>
                <input
                  type="email"
                  required
                  placeholder="professor@fuctura.com.br"
                  value={teacherFormData.email}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Especialidade / Matérias</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Arquiteto Java, Spring Boot e Microsserviços"
                  value={teacherFormData.specialty}
                  onChange={(e) => setTeacherFormData({ ...teacherFormData, specialty: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-emerald-400 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowTeacherModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 py-2 text-xs font-bold text-slate-950 shadow-md shadow-emerald-500/20"
                >
                  {editingTeacher ? 'Salvar Alterações' : 'Cadastrar Professor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================
          MODAL: CRIAR NOVA TURMA
         ======================================================== */}
      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Criar Nova Turma</h3>
              </div>
              <button
                onClick={() => setShowClassModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClass} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Nome da Turma</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Java Fullstack - Turma Sábado Noite"
                  value={classFormData.name}
                  onChange={(e) => setClassFormData({ ...classFormData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Código da Turma</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: JAVA-SAB-2026.2"
                    value={classFormData.code}
                    onChange={(e) => setClassFormData({ ...classFormData, code: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 font-mono text-indigo-300 focus:border-indigo-400 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Curso / Formação</label>
                  <select
                    value={classFormData.courseId}
                    onChange={(e) => setClassFormData({ ...classFormData, courseId: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                    required
                  >
                    <option value="">Selecione o Curso...</option>
                    {(data.courses || []).map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Dias da Semana</label>
                  <select
                    value={classFormData.daysOfWeek}
                    onChange={(e) => setClassFormData({ ...classFormData, daysOfWeek: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="SAB">Aos Sábados</option>
                    <option value="SEG,QUA">Segunda e Quarta</option>
                    <option value="TER,QUI">Terça e Quinta</option>
                    <option value="SEG,TER,QUA,QUI">Intensivo Semanal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Horário das Aulas</label>
                  <input
                    type="text"
                    required
                    placeholder="08:30 - 12:30 ou 19:00 - 22:00"
                    value={classFormData.scheduleTime}
                    onChange={(e) => setClassFormData({ ...classFormData, scheduleTime: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Professor Responsável</label>
                <select
                  value={classFormData.teacherId}
                  onChange={(e) => setClassFormData({ ...classFormData, teacherId: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                >
                  <option value="">Atribuir professor depois</option>
                  {(data.teachers || []).map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-indigo-500 hover:bg-indigo-400 px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-500/20"
                >
                  Criar Turma
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Modal de Diário de Aula para Diretoria */}
      {selectedLessonForDiaryId && (
        <LessonDiaryModal
          isOpen={!!selectedLessonForDiaryId}
          onClose={() => setSelectedLessonForDiaryId(null)}
          lessonId={selectedLessonForDiaryId}
          userRole="DIRETOR"
          onSaved={loadDashboard}
        />
      )}
    </div>
  );
};
