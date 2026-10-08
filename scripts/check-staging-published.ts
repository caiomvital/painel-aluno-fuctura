// Default: GET-only publication checks. Authentication is separately authorized and may award login XP.
import { readFileSync } from "node:fs";
import { appOrigin } from "../lib/production-config";
import {
  approveStagingTarget,
  fictionalAccountPassword,
} from "../lib/staging-target";
import { operationalLog } from "../lib/operational-log";
async function run() {
  if (
    process.env.APP_ENV !== "staging" ||
    process.env.NODE_TLS_REJECT_UNAUTHORIZED === "0"
  )
    throw new Error("Homologação HTTPS com TLS válido obrigatória.");
  const origin = appOrigin(process.env.APP_URL, true)!;
  const authenticate = process.argv.includes("--authenticate");
  let approvedTarget: string | undefined;
  if (
    process.argv
      .slice(2)
      .some((a) => a !== "--authenticate" && !a.startsWith("--confirm="))
  )
    throw new Error("Argumentos recusados.");
  if (authenticate) {
    const confirmation = process.argv
      .find((a) => a.startsWith("--confirm="))
      ?.slice("--confirm=".length);
    const approval = JSON.parse(
      readFileSync(process.env.HOMOLOGATION_APPROVAL_FILE ?? "", "utf8"),
    );
    const target = approveStagingTarget(process.env, approval, confirmation);
    if (confirmation !== target.confirmation)
      throw new Error("Login exige autorização explícita do banco isolado.");
    approvedTarget = target.target;
  }
  const user = process.env.STAGING_GATE_USER,
    password = process.env.STAGING_GATE_PASSWORD;
  if (!user || !password)
    throw new Error("Credenciais da barreira Nginx obrigatórias.");
  const authorization =
    "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
  const checks: { name: string; status: string }[] = [];
  const request = (path: string, init: RequestInit = {}) =>
    fetch(origin + path, {
      ...init,
      redirect: "error",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: authorization, ...init.headers },
    });
  async function verify(name: string, ok: boolean) {
    checks.push({ name, status: ok ? "APROVADO" : "BLOQUEADO" });
    if (!ok) throw new Error("Verificação reprovada.");
  }
  try {
    const gate = await fetch(origin + "/api/health/live", {
      redirect: "error",
      signal: AbortSignal.timeout(15000),
    });
    await verify("Barreira adicional sem credenciais", gate.status === 401);
    for (const path of [
      "/",
      "/api/health/live",
      "/api/health/ready",
      "/robots.txt",
      "/manifest.webmanifest",
      "/sw.js",
      "/pwa-192x192.png",
      "/pwa-512x512.png",
    ]) {
      const response = await request(path);
      await verify(`${path}: HTTP`, response.status === 200);
      await verify(
        `${path}: anti-indexação`,
        /noindex/.test(response.headers.get("x-robots-tag") ?? ""),
      );
      if (path.startsWith("/api/health")) {
        const data = await response.json();
        await verify(
          `${path}: estado público mínimo`,
          Object.keys(data).length === 1 &&
            data.status === (path.endsWith("live") ? "alive" : "ready"),
        );
        await verify(
          `${path}: ambiente`,
          response.headers.get("x-fuctura-environment") === "staging",
        );
      }
      if (path === "/robots.txt")
        await verify(
          "Robots restrito",
          /Disallow: \/\s/.test(await response.text()),
        );
      if (path === "/manifest.webmanifest") {
        const data = await response.json();
        await verify(
          "Manifest e ícones declarados",
          data.start_url === "/" &&
            data.icons.some((i: { sizes: string }) => i.sizes === "192x192") &&
            data.icons.some((i: { sizes: string }) => i.sizes === "512x512"),
        );
      }
      if (path === "/sw.js")
        await verify(
          "Service worker atualizado sem cache HTTP persistente",
          /no-store/.test(response.headers.get("cache-control") ?? ""),
        );
    }
    await verify(
      "Detalhes protegidos sem sessão",
      (await request("/api/health/details")).status === 401,
    );
    if (authenticate) {
      const fixturePassword = fictionalAccountPassword(
        process.env.HOMOLOGATION_ACCOUNT_PASSWORD,
        process.env.AUTH_SECRET,
      );
      // Verify the actual server database with a manually obtained staging DIRECTOR session
      // before any automated login (student login may write daily XP).
      const directorSession = process.env.STAGING_DIRECTOR_SESSION;
      if (
        !directorSession ||
        !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
          directorSession,
        )
      )
        throw new Error(
          "Sessão exclusiva de diretor de homologação obrigatória.",
        );
      const initialDetails = await request("/api/health/details", {
        headers: { Cookie: `fuctura_session=${directorSession}` },
      });
      const actualTarget = await initialDetails.json();
      await verify(
        "Alvo real autorizado antes de qualquer login automático",
        initialDetails.status === 200 &&
          actualTarget.stagingTarget === approvedTarget &&
          actualTarget.stagingDirectTarget === approvedTarget,
      );
      for (const [email, path, expected] of [
        ["director.homologacao@example.test", "/api/director/dashboard", 200],
        ["teacher.homologacao@example.test", "/api/director/dashboard", 403],
        ["student1.homologacao@example.test", "/api/director/dashboard", 403],
      ] as const) {
        const login = await request("/api/auth/login", {
          method: "POST",
          headers: { Origin: origin, "Content-Type": "application/json" },
          body: JSON.stringify({ email, password: fixturePassword }),
        });
        await verify(`Login ${email.split(".")[0]}`, login.status === 200);
        const cookie = login.headers.get("set-cookie") ?? "";
        await verify(
          "Cookie HttpOnly/Secure/Lax",
          /HttpOnly/i.test(cookie) &&
            /Secure/i.test(cookie) &&
            /SameSite=Lax/i.test(cookie),
        );
        const sessionCookie = cookie.split(";")[0];
        if (email === "director.homologacao@example.test") {
          const details = await request("/api/health/details", {
            headers: { Cookie: sessionCookie },
          });
          const target = await details.json();
          await verify(
            "Banco publicado corresponde ao alvo isolado autorizado",
            details.status === 200 &&
              target.stagingTarget === approvedTarget &&
              target.stagingDirectTarget === approvedTarget,
          );
        }
        await verify(
          `Autorização ${email.split(".")[0]}`,
          (await request(path, { headers: { Cookie: sessionCookie } }))
            .status === expected,
        );
        await verify(
          "Logout",
          (
            await request("/api/auth/logout", {
              method: "POST",
              headers: { Origin: origin, Cookie: sessionCookie },
            })
          ).status === 200,
        );
      }
    }
  } finally {
    console.log(
      JSON.stringify({
        checks,
        mode: authenticate
          ? "login autorizado — pode conceder XP"
          : "GET somente leitura HTTP",
        functionalHomologationComplete: false,
      }),
    );
  }
  if (!authenticate)
    console.log(
      "Autenticação/integridade/PWA instalada: NÃO EXECUTADO. Siga o roteiro funcional.",
    );
}
run().catch((error) => {
  operationalLog("staging.published.failed", error);
  process.exitCode = 1;
});
