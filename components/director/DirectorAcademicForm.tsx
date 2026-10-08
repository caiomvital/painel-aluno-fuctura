"use client";
import { useState, type FormEvent } from "react";
import type { DirectorDashboardData } from "@/lib/academic-service";
import { api, buttonClass, fieldClass, statusLabel } from "./director-ui";
export type AcademicEditor = {
  kind: "classes" | "teachers" | "students";
  id?: string;
  values: Record<string, string>;
};
export default function DirectorAcademicForm({
  editor,
  data,
  onClose,
  onSaved,
}: {
  editor: AcademicEditor;
  data: DirectorDashboardData;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [values, setValues] = useState(editor.values);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const names = { classes: "turma", teachers: "professor", students: "aluno" };
  function input(key: string, label: string, type = "text", required = true) {
    return (
      <label className="block" key={key}>
        {label}
        <input
          className={fieldClass}
          type={type}
          required={required}
          value={values[key] ?? ""}
          min={type === "number" ? 1 : undefined}
          onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        />
      </label>
    );
  }
  function select(
    key: string,
    label: string,
    options: { id: string; name: string }[],
    required = false,
    empty = "Não atribuído",
  ) {
    return (
      <label className="block">
        {label}
        <select
          aria-label={label}
          className={fieldClass}
          required={required}
          value={values[key] ?? ""}
          onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
        >
          <option value="">{empty}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
    );
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload =
        editor.kind === "classes"
          ? {
              ...values,
              teacherId: values.teacherId || null,
              endDate: values.endDate || null,
              durationMinutes: Number(values.durationMinutes),
              lessonsPerWeek: Number(values.lessonsPerWeek),
              ...(editor.id ? { classId: editor.id } : {}),
            }
          : { ...values, ...(editor.id ? { id: editor.id } : {}) };
      await api(
        `/api/director/${editor.kind}`,
        editor.id ? "PUT" : "POST",
        payload,
      );
      await onSaved();
      onClose();
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="academic-title"
        className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-700 bg-slate-900 p-5 text-white"
      >
        <div className="flex items-center justify-between gap-3">
          <h2 id="academic-title" className="font-bold text-lg">
            {editor.id ? "Editar" : "Cadastrar"} {names[editor.kind]}
          </h2>
          <button className={buttonClass} onClick={onClose} disabled={saving}>
            Fechar formulário
          </button>
        </div>
        <form onSubmit={save} className="mt-4 grid gap-3 sm:grid-cols-2">
          {input("name", "Nome")}
          {editor.kind === "classes" ? (
            <>
              {input("code", "Código")}
              {select(
                "courseId",
                "Curso",
                data.courses,
                true,
                "Selecione um curso",
              )}
              {select("teacherId", "Professor responsável", data.teachers)}
              {input("daysOfWeek", "Dias da semana")}
              {input("scheduleTime", "Horário")}
              {input("durationMinutes", "Duração em minutos", "number")}
              {input("lessonsPerWeek", "Aulas por semana", "number")}
              {input("startDate", "Data inicial", "date")}
              {input("endDate", "Data final", "date", false)}
              {editor.id &&
                select(
                  "status",
                  "Situação da turma",
                  ["ACTIVE", "FINISHED", "UPCOMING"].map((id) => ({
                    id,
                    name: statusLabel[id],
                  })),
                  true,
                )}
            </>
          ) : (
            <>
              {input("email", "E-mail", "email")}
              {editor.kind === "teachers"
                ? input("specialty", "Especialidade", "text", false)
                : input(
                    "registrationNumber",
                    "Número da matrícula",
                    "text",
                    false,
                  )}
            </>
          )}
          {error && (
            <p role="alert" className="text-rose-300 sm:col-span-2">
              {error}
            </p>
          )}
          <button className={buttonClass} disabled={saving}>
            {saving ? "Salvando…" : "Salvar cadastro"}
          </button>
        </form>
      </section>
    </div>
  );
}
