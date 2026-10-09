"use client";
import { RegistrationRequests } from "./RegistrationRequests";
import { useEffect, useState } from "react";
import type { DirectorDashboardData } from "@/lib/academic-service";
import { LessonDiaryModal } from "@/components/lessons/LessonDiaryModal";
import DirectorAcademicForm, {
  type AcademicEditor,
} from "./DirectorAcademicForm";
import DirectorFinanceControls from "./DirectorFinanceControls";
import {
  api,
  buttonClass,
  fieldClass,
  statusLabel,
  dateLabel,
} from "./director-ui";
const tabs = [
  "Visão Geral",
  "Turmas",
  "Professores",
  "Alunos",
  "Aulas e Presenças",
  "Gamificação e Leilões",
] as const;
type Tab = (typeof tabs)[number];
type Lesson = DirectorDashboardData["lessons"][number];
const panel =
  "rounded-2xl border border-slate-800 bg-slate-900/70 p-4 space-y-3";
function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-400 py-3">{children}</p>;
}
export function DirectorView() {
  const [data, setData] = useState<DirectorDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<Tab>("Visão Geral");
  const [classId, setClassId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [search, setSearch] = useState("");
  const [enrollmentStatus, setEnrollmentStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [diaryStatus, setDiaryStatus] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("PENDING");
  const [lessonFilter, setLessonFilter] = useState("");
  const [diary, setDiary] = useState<string | null>(null);
  const [editor, setEditor] = useState<AcademicEditor | null>(null);
  const [enrollClass, setEnrollClass] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    function onNavigate(event: Event) {
      const detail = (event as CustomEvent<import('@/lib/panel-navigation').PanelTarget>).detail;
      setClassId(''); setTeacherId(''); setStudentId(''); setSearch(''); setLessonFilter('');
      setFrom(''); setTo(''); setDiaryStatus(''); setEnrollmentStatus(''); setAttendanceStatus('PENDING');
      const mapping: Record<string, Tab> = { overview: 'Visão Geral', registrations: 'Alunos', students: 'Alunos', teachers: 'Professores', classes: 'Turmas', attendance: 'Aulas e Presenças', diary: 'Aulas e Presenças', lessons: 'Aulas e Presenças', auction: 'Gamificação e Leilões' };
      setTab(mapping[detail.target] ?? 'Visão Geral');
      if (detail.target === 'diary' && detail.id) setDiary(detail.id);
      if (detail.classId) setClassId(detail.classId);
      if (detail.target === 'classes' && detail.id) setClassId(detail.id);
      if (detail.target === 'teachers' && detail.id) setTeacherId(detail.id);
      if (detail.target === 'students' && detail.id) setStudentId(detail.id);
      if (detail.target === 'auction' && detail.id) window.setTimeout(() => document.querySelector(`[data-testid="auction-${CSS.escape(detail.id!)}"]`)?.scrollIntoView({ block: 'center' }), 500);
    }
    window.addEventListener('panel:navigate', onNavigate);
    return () => window.removeEventListener('panel:navigate', onNavigate);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    api("/api/director/dashboard", undefined, undefined, controller.signal)
      .then(setData)
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  async function reload() {
    const json = await api("/api/director/dashboard");
    setData(json);
    setError("");
  }
  async function retry() {
    setLoading(true);
    try {
      await reload();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }
  async function mutate(url: string, method: string, body: unknown) {
    setBusy(true);
    setNotice("");
    setError("");
    try {
      await api(url, method, body);
      await reload();
      setNotice("Alteração salva.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(next: Tab) {
    setTab(next);
    setClassId("");
    setTeacherId("");
    setStudentId("");
    setSearch("");
    setLessonFilter("");
    setFrom("");
    setTo("");
    setDiaryStatus("");
    setEnrollmentStatus("");
    setAttendanceStatus("PENDING");
  }
  function openClass(id: string) {
    navigate("Turmas");
    setClassId(id);
  }
  function openAttendance(id: string, lessonId?: string) {
    navigate("Aulas e Presenças");
    setClassId(id);
    setLessonFilter(lessonId ?? "");
  }
  function editClass(id?: string) {
    const cls = data?.classes.find((c) => c.id === id);
    setEditor({
      kind: "classes",
      id,
      values: cls
        ? {
            name: cls.name,
            code: cls.code,
            courseId: cls.courseId,
            teacherId: cls.teacherId ?? "",
            daysOfWeek: cls.daysOfWeek,
            scheduleTime: cls.scheduleTime,
            durationMinutes: String(cls.durationMinutes),
            lessonsPerWeek: String(cls.lessonsPerWeek),
            startDate: cls.startDate.slice(0, 10),
            endDate: cls.endDate?.slice(0, 10) ?? "",
            status: cls.status,
          }
        : {
            name: "",
            code: "",
            courseId: "",
            teacherId: "",
            daysOfWeek: "",
            scheduleTime: "",
            durationMinutes: "180",
            lessonsPerWeek: "1",
            startDate: "",
            endDate: "",
          },
    });
  }
  function editPerson(kind: "teachers" | "students", id?: string) {
    const person =
      kind === "teachers"
        ? data?.teachers.find((t) => t.id === id)
        : data?.students.find((s) => s.id === id);
    setEditor({
      kind,
      id,
      values: {
        name: person?.name ?? "",
        email: person?.email ?? "",
        ...(kind === "teachers"
          ? {
              specialty:
                person && "specialty" in person ? (person.specialty ?? "") : "",
            }
          : {
              registrationNumber:
                person && "registrationNumber" in person
                  ? person.registrationNumber
                  : "",
            }),
      },
    });
  }
  function lessonCard(l: Lesson) {
    return (
      <article key={l.id} data-testid={`lesson-${l.id}`} className={panel}>
        <h3 className="font-bold">
          Aula {l.lessonNumber} — {l.title}
        </h3>
        <p className="text-sm text-slate-300">
          {dateLabel(l.date)} • {l.scheduleTime} • {l.className} •{" "}
          {l.teacherName}
        </p>
        <p className="text-xs text-slate-400">
          {statusLabel[l.status]} •{" "}
          {l.isPast ? "Data passada" : "Data atual ou futura"} •{" "}
          {l.taughtTopics.length
            ? "Conteúdo ministrado registrado"
            : "Diário ainda não preenchido"}
        </p>
        <p className="text-sm">
          Planejado: {l.plannedTopics.join("; ") || "Sem tópicos planejados"}
        </p>
        <p className="text-xs text-emerald-300">
          {l.taughtTopics.length} tópico(s) ministrado(s) • {l.materials.length}{" "}
          link(s)
        </p>
        <button className={buttonClass} onClick={() => setDiary(l.id)}>
          Inspecionar / Editar Diário
        </button>
      </article>
    );
  }
  if (loading)
    return (
      <p role="status" className="p-6 text-slate-300">
        Carregando painel do diretor…
      </p>
    );
  if (!data)
    return (
      <div className="p-6 text-white">
        <p role="alert">{error || "Não foi possível carregar o painel."}</p>
        <button className={buttonClass} onClick={retry}>
          Tentar novamente
        </button>
      </div>
    );
  const cls = data.classes.find((c) => c.id === classId);
  const teacher = data.teachers.find((t) => t.id === teacherId);
  const student = data.students.find((s) => s.id === studentId);
  const query = search.toLocaleLowerCase("pt-BR");
  const filteredStudents = data.students.filter(
    (s) =>
      s.name.toLocaleLowerCase("pt-BR").includes(query) &&
      (!studentId || s.id === studentId) &&
      (!classId ||
        s.enrollments.some(
          (e) =>
            e.classId === classId &&
            (!enrollmentStatus || e.status === enrollmentStatus),
        )) &&
      (!enrollmentStatus ||
        s.enrollments.some(
          (e) =>
            e.status === enrollmentStatus &&
            (!classId || e.classId === classId),
        )),
  );
  const filteredLessons = data.lessons.filter(
    (l) =>
      (!classId || l.classId === classId) &&
      (!teacherId || l.teacherId === teacherId) &&
      (!from || l.date.slice(0, 10) >= from) &&
      (!to || l.date.slice(0, 10) <= to) &&
      (!lessonFilter || l.id === lessonFilter) &&
      (!diaryStatus ||
        (diaryStatus === "FILLED"
          ? l.taughtTopics.length > 0
          : l.taughtTopics.length === 0)) &&
      (attendanceStatus !== "WITH_PENDING" ||
        data.attendances.some(
          (a) => a.lessonId === l.id && a.status === "PENDING",
        )),
  );
  const lessonIds = new Set(filteredLessons.map((l) => l.id));
  const filteredAttendances = data.attendances.filter(
    (a) =>
      lessonIds.has(a.lessonId) &&
      (attendanceStatus === "RESOLVED"
        ? a.status !== "PENDING"
        : a.status === "PENDING"),
  );
  const classSelect = (
    <label>
      Filtrar por turma
      <select
        aria-label="Filtrar por turma"
        className={fieldClass}
        value={classId}
        onChange={(e) => {
          setClassId(e.target.value);
          setLessonFilter("");
        }}
      >
        <option value="">Todas as turmas</option>
        {data.classes.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </label>
  );
  const teacherSelect = (
    <label>
      Filtrar por professor
      <select
        aria-label="Filtrar por professor"
        className={fieldClass}
        value={teacherId}
        onChange={(e) => {
          setTeacherId(e.target.value);
          setLessonFilter("");
        }}
      >
        <option value="">Todos os professores</option>
        {data.teachers.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </label>
  );
  function attendanceCards() {
    return filteredAttendances.length ? (
      filteredAttendances.map((a) => (
        <article
          key={a.id}
          data-testid={`attendance-${a.id}`}
          className={panel}
        >
          <h3 className="font-bold">{a.studentName}</h3>
          <p>
            {a.className} • {a.lessonTitle} • {dateLabel(a.date)}
          </p>
          <p className="text-sm">
            {statusLabel[a.status]}
            {a.justification ? ` • Justificativa: ${a.justification}` : ""}
            {a.rejectionReason ? ` • ${a.rejectionReason}` : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className={buttonClass}
              onClick={() => setDiary(a.lessonId)}
            >
              Abrir aula correspondente
            </button>
            {a.status === "PENDING" && (
              <>
                <button
                  className={buttonClass}
                  disabled={busy}
                  onClick={() =>
                    mutate("/api/director/attendance", "POST", {
                      attendanceId: a.id,
                      action: "CONFIRM",
                    })
                  }
                >
                  Confirmar presença
                </button>
                <button
                  className={buttonClass}
                  disabled={busy}
                  onClick={() =>
                    mutate("/api/director/attendance", "POST", {
                      attendanceId: a.id,
                      action: "REJECT",
                    })
                  }
                >
                  Rejeitar presença
                </button>
              </>
            )}
          </div>
        </article>
      ))
    ) : (
      <Empty>
        {attendanceStatus === "RESOLVED"
          ? "Nenhuma presença resolvida neste filtro."
          : "Nenhuma presença pendente neste filtro."}
      </Empty>
    );
  }
  return (
    <div className="mx-auto max-w-7xl space-y-5 px-3 py-6 text-white sm:px-6">
      <header className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-[#0b1329] p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-400">
          Fuctura Tecnologia • Direção
        </p>
        <h1 className="text-2xl font-black mt-2">Olá, {data.director.name}.</h1>
        <p className="mt-2 text-sm text-slate-400">
          Gestão acadêmica da escola
        </p>
      </header>
      <nav
        aria-label="Áreas do diretor"
        className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2 lg:grid-cols-6"
      >
        {tabs.map((t) => (
          <button
            key={t}
            aria-current={tab === t ? "page" : undefined}
            onClick={() => navigate(t)}
            className={`${buttonClass} ${tab === t ? "bg-cyan-500/25 border-cyan-400" : ""}`}
          >
            {t}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="text-rose-300">
          {error}
          <button className={buttonClass} onClick={retry}>
            Atualizar dados
          </button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-emerald-300">
          {notice}
        </p>
      )}
      {tab === "Visão Geral" && (
        <>
          <h2 className="text-lg font-bold">Visão Geral</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            {[
              ["Turmas ativas", data.metrics.activeClasses],
              ["Alunos com matrícula ativa", data.metrics.activeStudents],
              ["Professores vinculados", data.metrics.assignedTeachers],
              ["Próximas aulas", data.metrics.upcomingLessons],
              ["Presenças pendentes", data.metrics.pendingAttendances],
              ["Diários pendentes", data.metrics.pendingDiaries],
            ].map(([label, value]) => (
              <div
                key={label}
                className={panel}
                data-testid={`metric-${label}`}
              >
                <span className="text-sm text-slate-400">{label}</span>
                <strong className="block text-2xl text-cyan-300">
                  {value}
                </strong>
              </div>
            ))}
          </div>
          <section className="space-y-3">
            <h2 className="font-bold">Próximas aulas</h2>
            {data.upcomingLessons.length ? (
              data.upcomingLessons.slice(0, 8).map(lessonCard)
            ) : (
              <Empty>Nenhuma próxima aula cadastrada.</Empty>
            )}
          </section>
          <section className="space-y-3">
            <h2 className="font-bold">Pendências acadêmicas</h2>
            {data.attendances
              .filter((a) => a.status === "PENDING")
              .map((a) => (
                <button
                  key={a.id}
                  className={`${buttonClass} block w-full text-left`}
                  onClick={() => openAttendance(a.classId, a.lessonId)}
                >
                  {a.studentName} • {a.className} • {a.lessonTitle} — presença
                  pendente
                </button>
              ))}
            {data.pendingDiaries.map((l) => (
              <button
                key={l.id}
                className={`${buttonClass} block w-full text-left`}
                onClick={() => setDiary(l.id)}
              >
                {l.className} • {l.title} • {dateLabel(l.date)} — diário
                pendente
              </button>
            ))}
            {!data.metrics.pendingAttendances &&
              !data.metrics.pendingDiaries && (
                <Empty>Nenhuma pendência acadêmica.</Empty>
              )}
            <p className="text-xs text-slate-400">
              Uma data passada não comprova que a aula foi ministrada.
            </p>
          </section>
        </>
      )}
      {tab === "Turmas" && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Turmas</h2>
            <button
              className={buttonClass}
              disabled={!data.courses.length}
              onClick={() => editClass()}
            >
              Nova Turma
            </button>
          </div>
          {!data.courses.length && (
            <Empty>
              Cadastre um curso pelo fluxo acadêmico existente antes de criar
              turmas.
            </Empty>
          )}
          {cls ? (
            <section className="space-y-4">
              <div className={panel}>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => setClassId("")}
                  >
                    Voltar às turmas
                  </button>
                  <button
                    className={buttonClass}
                    onClick={() => editClass(cls.id)}
                  >
                    Editar turma
                  </button>
                </div>
                <h2 className="font-bold text-xl">{cls.name}</h2>
                <p>
                  {cls.code} • {cls.courseName} • {statusLabel[cls.status]}
                </p>
                <p>
                  {cls.daysOfWeek} • {cls.scheduleTime} • {cls.teacherName}
                </p>
                <p className="text-xs">
                  Módulos do curso:{" "}
                  {data.courses
                    .find((c) => c.id === cls.courseId)
                    ?.modules.map((m) => m.title)
                    .join(", ") || "Nenhum módulo cadastrado"}
                </p>
                <p className="text-sm">
                  {cls.enrolledCount} alunos ativos • {cls.pedagogy.scheduled}{" "}
                  aulas programadas • {cls.pedagogy.past} com data passada •{" "}
                  {cls.pedagogy.diaries} diários preenchidos •{" "}
                  {cls.pedagogy.future} futuras •{" "}
                  {cls.pedagogy.pendingAttendances} presenças pendentes
                </p>
                <p className="text-sm">
                  Diários de aulas passadas:{" "}
                  {cls.pedagogy.pastDiaryPercent === null
                    ? "Sem aulas passadas"
                    : `${cls.pedagogy.pastDiaryPercent}% preenchidos`}
                </p>
                <button
                  className={buttonClass}
                  onClick={() => openAttendance(cls.id)}
                >
                  Resolver presenças pendentes
                </button>
              </div>
              <section className={panel}>
                <h3 className="font-bold">Alunos matriculados</h3>
                {cls.enrollments.length ? (
                  cls.enrollments.map((e) => (
                    <button
                      key={e.id}
                      className={`${buttonClass} block w-full text-left`}
                      onClick={() => {
                        navigate("Alunos");
                        setStudentId(e.studentId);
                      }}
                    >
                      {e.name} • {statusLabel[e.status]}
                    </button>
                  ))
                ) : (
                  <Empty>Turma sem alunos.</Empty>
                )}
              </section>
              <h3 className="font-bold">Cronograma e diários</h3>
              {cls.lessons.length ? (
                cls.lessons.map(lessonCard)
              ) : (
                <Empty>Turma sem aulas cadastradas.</Empty>
              )}
            </section>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {data.classes.length ? (
                data.classes.map((c) => (
                  <article
                    key={c.id}
                    data-testid={`class-${c.id}`}
                    className={panel}
                  >
                    <button
                      className="text-left font-bold text-lg text-cyan-200"
                      onClick={() => openClass(c.id)}
                    >
                      {c.name}
                    </button>
                    <p>
                      {c.courseName} • {c.code} • {statusLabel[c.status]}
                    </p>
                    <p className="text-sm">
                      {c.teacherName} • {c.daysOfWeek} • {c.scheduleTime}
                    </p>
                    <p className="text-sm">
                      {c.enrolledCount} alunos ativos • Próxima aula:{" "}
                      {c.nextLesson
                        ? `${dateLabel(c.nextLesson.date)} ${c.nextLesson.scheduleTime}`
                        : "Nenhuma cadastrada"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        className={buttonClass}
                        onClick={() => openClass(c.id)}
                      >
                        Diário de Aulas ({c.lessons.length})
                      </button>
                      <button
                        className={buttonClass}
                        onClick={() => editClass(c.id)}
                      >
                        Editar turma
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <Empty>Escola sem turmas.</Empty>
              )}
            </div>
          )}
        </>
      )}
      {tab === "Professores" && (
        <>
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-bold text-lg">Professores</h2>
            <button
              className={buttonClass}
              onClick={() => editPerson("teachers")}
            >
              Cadastrar professor
            </button>
          </div>
          <label>
            Buscar professor
            <input
              className={fieldClass}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {data.teachers
            .filter((t) => t.name.toLocaleLowerCase("pt-BR").includes(query))
            .map((t) => (
              <article key={t.id} className={panel}>
                <button
                  className="font-bold text-cyan-200"
                  onClick={() => setTeacherId(t.id)}
                >
                  {t.name}
                </button>
                <p className="text-sm">
                  {t.specialty || "Especialidade não informada"} •{" "}
                  {t.assignedClassesCount} turmas
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    className={buttonClass}
                    onClick={() => editPerson("teachers", t.id)}
                  >
                    Editar professor
                  </button>
                  <button
                    className={buttonClass}
                    onClick={() => setTeacherId(t.id)}
                  >
                    Turmas e cronograma
                  </button>
                </div>
              </article>
            ))}
          {!data.teachers.length && <Empty>Nenhum professor cadastrado.</Empty>}
          {teacher && (
            <section className={panel}>
              <h3 className="font-bold">Turmas de {teacher.name}</h3>
              {!teacher.classIds.length && <Empty>Professor sem turmas.</Empty>}
              {data.classes
                .filter((c) => c.teacherId === teacher.id)
                .map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center gap-3">
                    <button
                      className={buttonClass}
                      onClick={() => openClass(c.id)}
                    >
                      {c.name}
                    </button>
                    <button
                      className={buttonClass}
                      disabled={busy}
                      onClick={() =>
                        mutate("/api/director/classes", "PUT", {
                          classId: c.id,
                          teacherId: null,
                        })
                      }
                    >
                      Remover responsabilidade de {c.name}
                    </button>
                  </div>
                ))}
              <label>
                Atribuir turma
                <select
                  aria-label="Atribuir turma"
                  className={fieldClass}
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {data.classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} — {c.teacherName}
                    </option>
                  ))}
                </select>
              </label>
              <button
                className={buttonClass}
                disabled={busy || !classId}
                onClick={() =>
                  mutate("/api/director/classes", "PUT", {
                    classId,
                    teacherId: teacher.id,
                  })
                }
              >
                Atribuir professor
              </button>
              <button
                className={buttonClass}
                onClick={() => {
                  navigate("Aulas e Presenças");
                  setTeacherId(teacher.id);
                }}
              >
                Consultar cronograma do professor
              </button>
            </section>
          )}
        </>
      )}
      {tab === "Alunos" && (
        <>
          <RegistrationRequests onApproved={reload} />
          <div className="flex flex-wrap justify-between gap-3">
            <h2 className="font-bold text-lg">Alunos</h2>
            <button
              className={buttonClass}
              onClick={() => editPerson("students")}
            >
              Cadastrar aluno
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <label>
              Buscar aluno por nome
              <input
                className={fieldClass}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            {classSelect}
            <label>
              Situação da matrícula
              <select
                aria-label="Situação da matrícula"
                className={fieldClass}
                value={enrollmentStatus}
                onChange={(e) => setEnrollmentStatus(e.target.value)}
              >
                <option value="">Todas</option>
                {["ACTIVE", "COMPLETED", "DROPPED"].map((s) => (
                  <option key={s} value={s}>
                    {statusLabel[s]}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {filteredStudents.length ? (
            filteredStudents.map((s) => (
              <article
                key={s.id}
                data-testid={`student-${s.id}`}
                className={panel}
              >
                <button
                  className="font-bold text-cyan-200"
                  onClick={() => {
                    setStudentId(s.id);
                    setEnrollClass("");
                  }}
                >
                  {s.name}
                </button>
                <p className="text-sm">
                  {s.registrationNumber} •{" "}
                  {s.enrollments
                    .map((e) => `${e.className} (${statusLabel[e.status]})`)
                    .join(", ") || "Aluno sem matrícula"}
                </p>
                <p className="text-sm">
                  {s.currentXp} XP • {s.coinBalance} Coins • Frequência:{" "}
                  {s.attendanceRate === null
                    ? "Sem registros resolvidos"
                    : `${s.attendanceRate}%`}{" "}
                  • {s.presentCount} presenças • {s.absentCount} faltas
                  registradas • {s.pendingCount} pendentes
                </p>
                <button
                  className={buttonClass}
                  onClick={() => editPerson("students", s.id)}
                >
                  Editar aluno
                </button>
              </article>
            ))
          ) : (
            <Empty>Nenhum aluno neste filtro.</Empty>
          )}
          {student && (
            <section className={panel} data-testid="student-details">
              <h3 className="font-bold">Dados acadêmicos de {student.name}</h3>
              <p className="text-sm">
                {student.email} • {student.currentXp} XP • {student.coinBalance}{" "}
                Coins ({student.reservedCoins} reservados)
              </p>
              {student.enrollments.map((e) => (
                <div key={e.id} className="grid gap-2 sm:grid-cols-2">
                  <button
                    className={buttonClass}
                    onClick={() => openClass(e.classId)}
                  >
                    {e.className}
                  </button>
                  <div>
                    <p className="text-xs text-slate-400">
                      Frequência na turma:{" "}
                      {e.attendanceRate === null
                        ? "Sem registros resolvidos"
                        : `${e.attendanceRate}%`}{" "}
                      • {e.pendingCount} pendentes
                    </p>
                    <label>
                      Situação em {e.className}
                      <select
                        aria-label={`Situação em ${e.className}`}
                        className={fieldClass}
                        disabled={busy}
                        value={e.status}
                        onChange={(event) =>
                          mutate("/api/director/enrollments", "PUT", {
                            id: e.id,
                            status: event.target.value,
                          })
                        }
                      >
                        {["ACTIVE", "COMPLETED", "DROPPED"].map((s) => (
                          <option key={s} value={s}>
                            {statusLabel[s]}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
              {!student.enrollments.length && (
                <Empty>Aluno sem matrícula.</Empty>
              )}
              <form
                className="flex flex-wrap items-end gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  mutate("/api/director/enrollments", "POST", {
                    studentId: student.id,
                    classId: enrollClass,
                  });
                }}
              >
                <label className="flex-1">
                  Turma para matrícula
                  <select
                    aria-label="Turma para matrícula"
                    className={fieldClass}
                    required
                    value={enrollClass}
                    onChange={(e) => setEnrollClass(e.target.value)}
                  >
                    <option value="">Selecione</option>
                    {data.classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </label>
                <button className={buttonClass} disabled={busy}>
                  Matricular aluno
                </button>
              </form>
              <h4 className="font-bold">Registros de presença</h4>
              {data.attendances
                .filter((a) => a.studentId === student.id)
                .map((a) => (
                  <button
                    className={`${buttonClass} block w-full text-left`}
                    key={a.id}
                    onClick={() => {
                      openAttendance(a.classId, a.lessonId);
                      setAttendanceStatus(
                        a.status === "PENDING" ? "PENDING" : "RESOLVED",
                      );
                    }}
                  >
                    {dateLabel(a.date)} • {a.className} • {a.lessonTitle} •{" "}
                    {statusLabel[a.status]}
                  </button>
                ))}
            </section>
          )}
        </>
      )}
      {tab === "Aulas e Presenças" && (
        <>
          <h2 className="font-bold text-lg">Aulas e Presenças</h2>
          <div className={`${panel} grid gap-3 sm:grid-cols-3`}>
            {classSelect}
            {teacherSelect}
            <label>
              Aula
              <select
                aria-label="Aula"
                className={fieldClass}
                value={lessonFilter}
                onChange={(e) => setLessonFilter(e.target.value)}
              >
                <option value="">Todas as aulas</option>
                {data.lessons
                  .filter(
                    (l) =>
                      (!classId || l.classId === classId) &&
                      (!teacherId || l.teacherId === teacherId),
                  )
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.className} — {l.title}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Período inicial
              <input
                type="date"
                className={fieldClass}
                value={from}
                onChange={(e) => setFrom(e.target.value)}
              />
            </label>
            <label>
              Período final
              <input
                type="date"
                className={fieldClass}
                value={to}
                onChange={(e) => setTo(e.target.value)}
              />
            </label>
            <label>
              Situação do diário
              <select
                aria-label="Situação do diário"
                className={fieldClass}
                value={diaryStatus}
                onChange={(e) => setDiaryStatus(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="FILLED">Preenchido</option>
                <option value="EMPTY">Não preenchido</option>
              </select>
            </label>
            <label>
              Solicitações de presença
              <select
                aria-label="Solicitações de presença"
                className={fieldClass}
                value={attendanceStatus}
                onChange={(e) => setAttendanceStatus(e.target.value)}
              >
                <option value="PENDING">Pendentes</option>
                <option value="RESOLVED">Resolvidas</option>
                <option value="WITH_PENDING">
                  Somente aulas com pendências
                </option>
              </select>
            </label>
          </div>
          <section className="space-y-3">
            <h3 className="font-bold">
              {attendanceStatus === "RESOLVED"
                ? "Presenças resolvidas"
                : "Presenças pendentes"}
            </h3>
            {attendanceCards()}
          </section>
          <section className="space-y-3">
            <h3 className="font-bold">Cronograma de aulas</h3>
            {filteredLessons.length ? (
              filteredLessons.map(lessonCard)
            ) : (
              <Empty>Nenhuma aula neste filtro.</Empty>
            )}
          </section>
        </>
      )}
      {tab === "Gamificação e Leilões" && (
        <DirectorFinanceControls data={data} onChanged={reload} />
      )}
      {editor && (
        <DirectorAcademicForm
          key={`${editor.kind}-${editor.id ?? "new"}`}
          editor={editor}
          data={data}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            await reload();
            setNotice("Cadastro salvo.");
          }}
        />
      )}
      {diary && (
        <LessonDiaryModal
          isOpen
          onClose={() => setDiary(null)}
          lessonId={diary}
          userRole="DIRETOR"
          onSaved={() => {
            reload().catch((e) => setError(e.message));
          }}
        />
      )}
    </div>
  );
}
