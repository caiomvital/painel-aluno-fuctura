"use client";
import { useCallback, useEffect, useState } from "react";
import { registrationCourses } from "@/lib/registration-input";
type Request = {
  id: string;
  course: keyof typeof registrationCourses;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
};
export function RegistrationRequests({
  onApproved,
}: {
  onApproved: () => Promise<void>;
}) {
  const [items, setItems] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [notice, setNotice] = useState("");
  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch("/api/director/registrations", { signal });
    const data = await response.json();
    if (!response.ok)
      throw new Error(data.error || "Falha ao carregar cadastros.");
    return data.registrations as Request[];
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((rows) => {
        if (!controller.signal.aborted) {
          setItems(rows);
          setError("");
        }
      })
      .catch((failure) => {
        if (!controller.signal.aborted)
          setError(
            failure instanceof Error ? failure.message : "Erro de conexão.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load]);
  const statusNames: Record<string, string> = {
    PENDING: "Pendente",
    APPROVED: "Aprovado",
    REJECTED: "Rejeitado",
  };
  const visible = items.filter((item) => item.status === filter);
  return (
    <section
      aria-label="Solicitações de cadastro"
      className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4"
    >
      <h2 className="text-lg font-bold">Solicitações de cadastro</h2>
      <p className="mt-1 text-sm text-slate-400">
        Aprovar libera o login. A matrícula em turma é feita separadamente.
      </p>
      <label className="my-3 block text-sm">
        Situação do cadastro{" "}
        <select
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-950 p-2"
        >
          {Object.entries(statusNames).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {notice && (
        <p role="status" className="my-2 text-cyan-300">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="my-2 text-rose-300">
          {error}{" "}
          <button
            className="underline"
            onClick={() => {
              setLoading(true);
              load()
                .then((rows) => {
                  setItems(rows);
                  setError("");
                })
                .catch((failure) =>
                  setError(
                    failure instanceof Error
                      ? failure.message
                      : "Erro de conexão.",
                  ),
                )
                .finally(() => setLoading(false));
            }}
          >
            Tentar novamente
          </button>
        </div>
      )}
      {loading ? (
        <p>Carregando cadastros…</p>
      ) : !error && visible.length === 0 ? (
        <p className="text-slate-400">Nenhum cadastro nesta situação.</p>
      ) : (
        <ul className="space-y-3">
          {visible.map((item) => (
            <li
              key={item.id}
              className="rounded-xl border border-slate-700 p-3"
            >
              <p className="font-semibold">{item.user.name}</p>
              <p className="break-all text-sm text-slate-400">
                {item.user.email}
              </p>
              <p className="text-sm">
                {registrationCourses[item.course]} · {statusNames[item.status]}{" "}
                · {new Date(item.createdAt).toLocaleDateString("pt-BR")}
              </p>
              {item.status === "PENDING" && (
                <div className="mt-3 flex flex-wrap gap-3">
                  {(["APPROVED", "REJECTED"] as const).map((decision) => (
                    <button
                      key={decision}
                      disabled={busy !== null}
                      className="rounded-lg border border-slate-600 px-3 py-2 disabled:opacity-50"
                      onClick={async () => {
                        setBusy(item.id);
                        setError("");
                        setNotice("");
                        try {
                          const response = await fetch(
                            "/api/director/registrations",
                            {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ id: item.id, decision }),
                            },
                          );
                          const data = await response.json();
                          if (!response.ok)
                            throw new Error(
                              data.error || "Falha ao salvar decisão.",
                            );
                          setItems((current) =>
                            current.map((row) =>
                              row.id === item.id ? data.registration : row,
                            ),
                          );
                          setNotice(
                            decision === "APPROVED"
                              ? "Cadastro aprovado. O aluno já pode entrar."
                              : "Cadastro rejeitado. O acesso permanece bloqueado.",
                          );
                          if (decision === "APPROVED") await onApproved();
                        } catch (failure) {
                          setError(
                            failure instanceof Error
                              ? failure.message
                              : "Falha de conexão.",
                          );
                        } finally {
                          setBusy(null);
                        }
                      }}
                    >
                      {busy === item.id
                        ? "Salvando…"
                        : decision === "APPROVED"
                          ? "Aprovar cadastro"
                          : "Rejeitar cadastro"}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
