"use client";
import { useState } from "react";
import Link from "next/link";
import { registrationCourses } from "@/lib/registration-input";
export function RegistrationForm() {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [password, setPassword] = useState("");
  const passwordTooLong = password.length > 8;
  const inputClass =
    "w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-white focus:border-cyan-400 focus:outline-none";
  return (
    <div className="mx-auto w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8">
      <h1 className="text-2xl font-bold text-white">Solicitar cadastro</h1>
      <p className="my-3 text-sm text-slate-400">
        Fuctura Tecnologia · O diretor aprovará seu cadastro e definirá seu
        perfil.
      </p>
      {message ? (
        <p
          role="status"
          className="my-5 rounded-xl bg-cyan-950 p-4 text-cyan-200"
        >
          {message}
        </p>
      ) : (
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (passwordTooLong) return;
            setError("");
            setSaving(true);
            const form = event.currentTarget;
            const values = Object.fromEntries(new FormData(form));
            try {
              const response = await fetch("/api/auth/register", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(values),
              });
              const data = await response.json();
              if (!response.ok)
                throw new Error(data.error || "Falha ao enviar cadastro.");
              form.reset();
              setPassword("");
              setMessage(data.message);
            } catch (failure) {
              setError(
                failure instanceof Error
                  ? failure.message
                  : "Falha de conexão.",
              );
            } finally {
              setSaving(false);
            }
          }}
        >
          <label className="block">
            Nome
            <input
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={120}
              className={inputClass}
            />
          </label>
          <label className="block">
            Curso
            <select
              aria-label="Curso"
              name="course"
              required
              defaultValue=""
              className={inputClass}
            >
              <option value="" disabled>
                Selecione um curso
              </option>
              {Object.entries(registrationCourses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            E-mail
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={254}
              required
              className={inputClass}
            />
          </label>
          <label className="block">
            Senha
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              pattern=".*[0-9].*"
              aria-invalid={passwordTooLong}
              aria-describedby={
                passwordTooLong
                  ? "password-help password-length-error"
                  : "password-help"
              }
              className={inputClass}
            />
          </label>
          <p id="password-help" className="text-xs text-slate-400">
            De 6 a 8 caracteres, com pelo menos um número. Não exige caracteres
            especiais ou letras maiúsculas.
          </p>
          {passwordTooLong && (
            <p
              id="password-length-error"
              role="alert"
              className="text-sm text-rose-300"
            >
              A senha pode ter no máximo 8 caracteres.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm text-rose-300">
              {error}
            </p>
          )}
          <button
            disabled={saving || passwordTooLong}
            className="w-full rounded-xl bg-cyan-600 p-3 font-bold text-white disabled:opacity-50"
          >
            {saving ? "Enviando…" : "Enviar cadastro"}
          </button>
        </form>
      )}
      <Link href="/" className="mt-5 block text-center text-cyan-300 underline">
        Voltar ao login
      </Link>
    </div>
  );
}
