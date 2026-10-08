"use client";
import { useCallback, useEffect, useState } from "react";
import type { TeacherDashboardData } from "@/lib/academic-service";
import { LessonDiaryModal } from "@/components/lessons/LessonDiaryModal";

const areas = [
  "Visão Geral",
  "Minhas Turmas",
  "Aulas e Diário",
  "Presenças",
  "Alunos",
] as const;
type Area = (typeof areas)[number];
const date = (value: string) =>
  new Date(value).toLocaleDateString("pt-BR", { timeZone: "UTC" });
const labels: Record<string, string> = {
  ACTIVE: "Ativa",
  FINISHED: "Encerrada",
  UPCOMING: "Em breve",
  COMPLETED: "Concluída",
  DROPPED: "Cancelada",
  PRESENT: "Confirmada",
  ABSENT: "Ausência registrada",
  EXCUSED: "Justificada",
  PENDING: "Pendente",
  SCHEDULED: "Programada",
  IN_PROGRESS: "Em andamento",
  CANCELLED: "Cancelada",
};
const button =
  "rounded-lg border border-white/15 px-3 py-2 hover:bg-white/10 disabled:opacity-50 text-sm";
const card = "rounded-xl border border-white/10 bg-white/5 p-4 space-y-3";
export function TeacherView() {
  const [data, setData] = useState<TeacherDashboardData | null>(null);
  const [area, setArea] = useState<Area>("Visão Geral");
  const [classId, setClassId] = useState("");
  const [lessonFilter, setLessonFilter] = useState("");
  const [diary, setDiary] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [resolved, setResolved] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/teacher/dashboard", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro de conexão.");
      setData(result);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/teacher/dashboard", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Erro de conexão.");
        return result as TeacherDashboardData;
      })
      .then((result) => {
        setData(result);
        setError("");
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(e instanceof Error ? e.message : "Erro de conexão.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);
  const selectClass = (id: string) => {
    setClassId(id);
    setLessonFilter("");
  };
  const openLesson = (id: string, cls: string) => {
    selectClass(cls);
    setArea("Aulas e Diário");
    setDiary(id);
  };
  const decision = async (id: string, action: "confirm" | "reject") => {
    setBusy(id);
    setError("");
    try {
      const response = await fetch(`/api/teacher/attendance/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendanceId: id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Falha ao resolver presença.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao resolver presença.");
    } finally {
      setBusy("");
    }
  };
  if (!data)
    return (
      <div className="p-6" aria-live="polite">
        {loading ? (
          "Carregando painel do professor…"
        ) : (
          <>
            <p role="alert">{error}</p>
            <button className={button} onClick={load}>
              Tentar novamente
            </button>
          </>
        )}
      </div>
    );
  const selected = data.classes.find((c) => c.id === classId);
  const classes = selected ? [selected] : data.classes;
  const lessons = classes.flatMap((c) => c.lessons);
  const attendances = data.attendances.filter(
    (a) =>
      (!classId || a.classId === classId) &&
      (!lessonFilter || a.lessonId === lessonFilter),
  );
  const schedule = (
    <div className="space-y-3">
      {lessons.length === 0 && <p>Nenhuma aula cadastrada.</p>}
      {lessons.map((l) => (
        <article key={l.id} data-testid={`lesson-${l.id}`} className={card}>
          <h3 className="font-semibold">
            Aula {l.lessonNumber} — {l.title}
          </h3>
          <p>
            {l.className} · {date(l.date)} · {l.scheduleTime}
          </p>
          <p>
            {labels[l.status]}
            {l.isPast ? " · Data passada" : ""} ·{" "}
            {l.taughtTopics.length
              ? "Conteúdo ministrado registrado"
              : "Diário ainda não preenchido"}
          </p>
          <p>
            Planejado:{" "}
            {l.plannedTopics.join(" • ") || "Sem tópicos planejados."}
          </p>
          <p>Ministrado: {l.taughtTopics.join(" • ") || "Sem registro."}</p>
          <button
            className={button}
            onClick={() => openLesson(l.id, l.classId)}
          >
            Editar Diário
          </button>
        </article>
      ))}
    </div>
  );
  const students = (
    <div className="space-y-3">
      {classes.map((c) => (
        <section key={c.id} className={card}>
          <h3 className="font-semibold">{c.name}</h3>
          {c.students.length === 0 && <p>Turma sem alunos.</p>}
          {c.students.map((s) => (
            <article key={s.id} className="border-t border-white/10 pt-3">
              <h4>
                {s.name} · {labels[s.enrollmentStatus]}
              </h4>
              <p>
                {s.confirmedCount} presenças · {s.absentCount} ausências
                registradas · {s.pendingCount} pendências
              </p>
              <p>
                Frequência:{" "}
                {s.attendanceRate === null
                  ? "Sem registros resolvidos"
                  : `${s.attendanceRate}% (${s.confirmedCount}/${s.resolvedCount} registros resolvidos)`}{" "}
                · XP acumulado: {s.currentXp}
              </p>
              {s.pendingCount > 0 && (
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Presenças");
                    setResolved(false);
                  }}
                >
                  Consultar pendências
                </button>
              )}
            </article>
          ))}
        </section>
      ))}
      <p className="text-sm text-white/60">
        Frequência calculada sobre registros de presença resolvidos. Aulas sem
        registro não são consideradas faltas.
      </p>
    </div>
  );
  return (
    <section className="space-y-5 p-4 md:p-6 min-w-0 break-words text-white">
      <header>
        <h1 className="text-2xl font-bold">Painel do Professor</h1>
        <p>{data.teacher?.name}</p>
      </header>
      <nav aria-label="Área do professor" className="flex flex-wrap gap-2">
        {areas.map((a) => (
          <button
            key={a}
            className={`${button} ${area === a ? "bg-cyan-500/20 border-cyan-500" : ""}`}
            aria-current={area === a ? "page" : undefined}
            onClick={() => setArea(a)}
          >
            {a}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className={card}>
          {error}{" "}
          <button className={button} onClick={load}>
            Tentar novamente
          </button>
        </div>
      )}
      {loading && <p role="status">Atualizando dados…</p>}
      {data.classes.length === 0 && (
        <p>Nenhuma turma atribuída a este professor.</p>
      )}
      {area !== "Visão Geral" && (
        <label className="block">
          Turma{" "}
          <select
            aria-label="Filtrar por turma"
            className="bg-slate-900 rounded p-2 max-w-full"
            value={classId}
            onChange={(e) => {
              selectClass(e.target.value);
              setLessonFilter("");
            }}
          >
            <option value="">Todas as minhas turmas</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      )}
      {area === "Visão Geral" && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[
              [data.classes.length, "Turmas atribuídas"],
              [data.indicators.scheduled, "Aulas programadas"],
              [data.indicators.past, "Aulas com data passada"],
              [data.indicators.completed, "Aulas concluídas no sistema"],
              [data.indicators.diaries, "Diários preenchidos"],
              [data.pendingAttendances.length, "Solicitações pendentes"],
            ].map(([value, label]) => (
              <div key={label} className={card}>
                <strong className="text-2xl">{value}</strong>
                <p>{label}</p>
              </div>
            ))}
          </div>
          <section className={card}>
            <h2 className="font-semibold">Próxima aula</h2>
            {data.upcomingLesson ? (
              <>
                <p>
                  {data.upcomingLesson.className} ·{" "}
                  {data.upcomingLesson.courseName}
                </p>
                <p>
                  {date(data.upcomingLesson.date)} ·{" "}
                  {data.upcomingLesson.scheduleTime}
                </p>
                <p>{data.upcomingLesson.title}</p>
                <p>
                  {data.upcomingLesson.plannedTopics.join(" • ") ||
                    "Tema não planejado."}
                </p>
                <button
                  className={button}
                  onClick={() =>
                    openLesson(
                      data.upcomingLesson!.id,
                      data.upcomingLesson!.classId,
                    )
                  }
                >
                  Abrir diário
                </button>
              </>
            ) : (
              <p>Nenhuma próxima aula programada.</p>
            )}
          </section>
          <section className={card}>
            <h2 className="font-semibold">Pendências de presença</h2>
            {data.pendingAttendances.length === 0 && (
              <p>Nenhuma presença pendente.</p>
            )}
            {data.pendingAttendances.map((a) => (
              <button
                key={a.id}
                className={`${button} block text-left w-full`}
                onClick={() => {
                  selectClass(a.classId);
                  setLessonFilter(a.lessonId);
                  setResolved(false);
                  setArea("Presenças");
                }}
              >
                {a.studentName} · {a.className} · {a.lessonTitle} ·{" "}
                {date(a.date)}
              </button>
            ))}
          </section>
          <section className={card}>
            <h2 className="font-semibold">Diários pendentes</h2>
            <p className="text-sm">
              Aulas concluídas ou com data passada sem tópicos ministrados. Isso não indica
              ausência do professor ou punição.
            </p>
            {data.pendingDiaries.length === 0 && <p>Nenhum diário pendente.</p>}
            {data.pendingDiaries.map((l) => (
              <button
                key={l.id}
                className={`${button} block text-left w-full`}
                onClick={() => openLesson(l.id, l.classId)}
              >
                {l.className} · {l.title} · {date(l.date)}
              </button>
            ))}
          </section>
          <section className={card}>
            <h2>Minhas turmas</h2>
            {data.classes.map((c) => (
              <button
                className={`${button} block w-full text-left`}
                key={c.id}
                onClick={() => {
                  selectClass(c.id);
                  setArea("Minhas Turmas");
                }}
              >
                {c.name} ·{" "}
                {c.nextLesson
                  ? `${date(c.nextLesson.date)} — ${c.nextLesson.title}`
                  : "Sem próxima aula"}
              </button>
            ))}
          </section>
        </>
      )}
      {area === "Minhas Turmas" && (
        <>
          {classes.map((c) => (
            <article key={c.id} data-testid={`class-${c.id}`} className={card}>
              <button
                className="text-lg font-semibold text-left"
                onClick={() => selectClass(c.id)}
              >
                {c.name}
              </button>
              <p>
                {c.courseName} · {labels[c.status]} · {c.daysOfWeek} ·{" "}
                {c.scheduleTime}
              </p>
              <p>
                {c.totalStudents} alunos ativos · Próxima aula:{" "}
                {c.nextLesson
                  ? `${date(c.nextLesson.date)} — ${c.nextLesson.title}`
                  : "Não programada"}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Aulas e Diário");
                  }}
                >
                  Diário de Aulas / Cronograma
                </button>
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Alunos");
                  }}
                >
                  Ver alunos
                </button>
                <button
                  className={button}
                  onClick={() => {
                    selectClass(c.id);
                    setArea("Presenças");
                    setResolved(false);
                  }}
                >
                  Presenças pendentes
                </button>
              </div>
            </article>
          ))}
          {selected && (
            <>
              <h2>Cronograma</h2>
              {schedule}
              <h2>Alunos matriculados</h2>
              {students}
            </>
          )}
        </>
      )}
      {area === "Aulas e Diário" && schedule}
      {area === "Alunos" && students}
      {area === "Presenças" && (
        <>
          <label className="block">
            Aula{" "}
            <select
              aria-label="Filtrar por aula"
              className="bg-slate-900 p-2 rounded max-w-full"
              value={lessonFilter}
              onChange={(e) => setLessonFilter(e.target.value)}
            >
              <option value="">Todas as aulas</option>
              {lessons.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className={button}
              onClick={() => setResolved(false)}
              aria-pressed={!resolved}
            >
              Pendentes
            </button>
            <button
              className={button}
              onClick={() => setResolved(true)}
              aria-pressed={resolved}
            >
              Resolvidas
            </button>
          </div>
          {attendances.filter((a) =>
            resolved ? a.status !== "PENDING" : a.status === "PENDING",
          ).length === 0 && (
            <p>
              {resolved
                ? "Nenhuma presença resolvida."
                : "Nenhuma presença pendente."}
            </p>
          )}
          {attendances
            .filter((a) =>
              resolved ? a.status !== "PENDING" : a.status === "PENDING",
            )
            .map((a) => (
              <article
                key={a.id}
                data-testid={`attendance-${a.id}`}
                className={card}
              >
                <h3>{a.studentName}</h3>
                <p>
                  {a.className} · {a.lessonTitle} · {date(a.date)}
                </p>
                <p>
                  {a.status === "ABSENT" && a.rejectionReason
                    ? "Solicitação rejeitada"
                    : labels[a.status]}
                </p>
                {a.justification && <p>Justificativa: {a.justification}</p>}
                {a.rejectionReason && <p>{a.rejectionReason}</p>}
                <div className="flex flex-wrap gap-2">
                  <button
                    className={button}
                    onClick={() => openLesson(a.lessonId, a.classId)}
                  >
                    Abrir aula
                  </button>
                  {a.status === "PENDING" && (
                    <>
                      <button
                        className={button}
                        disabled={!!busy}
                        onClick={() => decision(a.id, "confirm")}
                      >
                        Confirmar
                      </button>
                      <button
                        className={button}
                        disabled={!!busy}
                        onClick={() => decision(a.id, "reject")}
                      >
                        Rejeitar
                      </button>
                    </>
                  )}
                </div>
              </article>
            ))}
        </>
      )}
      {diary && (
        <LessonDiaryModal
          isOpen
          lessonId={diary}
          userRole="PROFESSOR"
          onClose={() => setDiary(null)}
          onSaved={load}
        />
      )}
    </section>
  );
}
