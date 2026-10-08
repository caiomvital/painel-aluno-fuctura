import { PrismaClient } from "@prisma/client";
import { lookup } from "node:dns/promises";
import { connect, type Socket } from "node:net";
import { connect as tlsConnect } from "node:tls";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { databaseUrl, isSupabaseHost } from "../lib/database-config";
import { inspectDatabaseSchema, type SchemaReport } from "./supabase-schema";

type Status = "APROVADA" | "FALHOU" | "NÃO EXECUTADA";
type Step = { name: string; status: Status; detail?: string };
type Target = {
  variable: string;
  host?: string;
  port?: number;
  mode?: string;
  steps: Step[];
  schema?: SchemaReport;
};
const names = [
  "Variável",
  "Formato da URL",
  "DNS",
  "Porta TCP",
  "TLS/certificado",
  "Autenticação",
  "SELECT 1 via Prisma",
  "Schema",
  "Migrations",
];
const code = (e: unknown) =>
  (e as { code?: string; errorCode?: string }).code ||
  (e as { errorCode?: string }).errorCode;
function safeFailure(e: unknown): string {
  const c = code(e);
  if (c && /^[A-Z0-9_]+$/.test(c)) return c;
  const message = String((e as { message?: string }).message || "");
  if (/Can't reach database server/i.test(message))
    return "PrismaClientInitializationError: servidor inacessível (antes da autenticação).";
  if (/Timed out fetching a new connection/i.test(message))
    return "PrismaClientInitializationError: tempo limite de conexão.";
  if (/authentication|password/i.test(message))
    return "Falha de autenticação; credenciais não foram exibidas.";
  if (/certificate|SSL|TLS/i.test(message))
    return "Falha TLS; validação mantida.";
  return "Falha na operação; detalhes potencialmente sensíveis não são registrados.";
}
function tcp(host: string, port: number): Promise<Socket> {
  return new Promise((resolve, reject) => {
    const socket = connect({ host, port });
    socket.setTimeout(5000);
    socket.once("connect", () => {
      socket.setTimeout(0);
      resolve(socket);
    });
    socket.once("error", (e) => {
      socket.destroy();
      reject(e);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }));
    });
  });
}
async function verifyTls(socket: Socket, url: URL) {
  try {
    const request = Buffer.alloc(8);
    request.writeInt32BE(8, 0);
    request.writeInt32BE(80877103, 4);
    const response = await new Promise<Buffer>((resolve, reject) => {
      socket.setTimeout(5000);
      socket.once("data", resolve);
      socket.once("error", reject);
      socket.once("timeout", () =>
        reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" })),
      );
      socket.once("end", () =>
        reject(Object.assign(new Error("closed"), { code: "ECONNRESET" })),
      );
      socket.write(request);
    });
    if (response[0] !== 83)
      throw Object.assign(new Error("PostgreSQL SSL não aceito"), {
        code: "POSTGRES_SSL_REJECTED",
      });
    socket.setTimeout(0);
    const certificate = url.searchParams.get("sslcert");
    await new Promise<void>((resolve, reject) => {
      const secured = tlsConnect({
        socket,
        servername: url.hostname,
        rejectUnauthorized: true,
        ...(certificate ? { ca: readFileSync(certificate) } : {}),
      });
      secured.setTimeout(5000);
      secured.once("secureConnect", () => {
        secured.destroy();
        resolve();
      });
      secured.once("error", (e: Error) => {
        secured.destroy();
        reject(e);
      });
      secured.once("timeout", () => {
        secured.destroy();
        reject(Object.assign(new Error("timeout"), { code: "ETIMEDOUT" }));
      });
    });
  } finally {
    socket.destroy();
  }
}
async function diagnose(
  variable: string,
  value: string | undefined,
): Promise<Target> {
  const result: Target = {
    variable,
    steps: names.map((name) => ({ name, status: "NÃO EXECUTADA" })),
  };
  const pass = (i: number, detail?: string) => {
    result.steps[i] = {
      name: names[i],
      status: "APROVADA",
      ...(detail ? { detail } : {}),
    };
  };
  const fail = (i: number, detail: string) => {
    result.steps[i] = { name: names[i], status: "FALHOU", detail };
  };
  if (!value) {
    fail(0, "Variável ausente. Configure em ambiente seguro.");
    return result;
  }
  pass(0);
  let url: URL;
  try {
    url = new URL(databaseUrl(value));
    if (
      !isSupabaseHost(url.hostname) ||
      !url.username ||
      !url.password ||
      url.pathname === "/"
    )
      throw new Error();
    if (url.searchParams.has("host")) throw new Error();
    if (
      variable === "DIRECT_URL" &&
      url.hostname.endsWith(".pooler.supabase.com") &&
      url.port === "6543"
    ) {
      fail(
        1,
        "DIRECT_URL não deve usar Transaction Pooler. Copie conexão direta ou Session Pooler do painel.",
      );
      return result;
    }
  } catch {
    fail(
      1,
      "URL PostgreSQL/Supabase inválida ou incompleta. Nenhuma credencial foi registrada.",
    );
    return result;
  }
  result.host = url.hostname;
  result.port = Number(url.port || 5432);
  result.mode = url.hostname.endsWith(".pooler.supabase.com")
    ? result.port === 6543
      ? "Transaction Pooler"
      : "Session Pooler"
    : "Direta";
  pass(
    1,
    "TLS obrigatório com sslaccept=strict; parâmetros de autenticação preservados.",
  );
  try {
    const addresses = await lookup(url.hostname, { all: true });
    pass(
      2,
      `Famílias resolvidas: ${[...new Set(addresses.map((a) => (a.family === 6 ? "IPv6" : "IPv4")))].join(", ")}.`,
    );
  } catch (e) {
    fail(2, safeFailure(e));
    return result;
  }
  let socket: Socket;
  try {
    socket = await tcp(url.hostname, result.port);
    pass(3);
  } catch (e) {
    fail(3, safeFailure(e));
    return result;
  }
  try {
    await verifyTls(socket, url);
    pass(4, "Handshake PostgreSQL TLS com certificado e hostname validados.");
  } catch (e) {
    fail(4, safeFailure(e));
    return result;
  }
  url.searchParams.set("connect_timeout", "5");
  url.searchParams.set("pool_timeout", "5");
  url.searchParams.set("socket_timeout", "15");
  url.searchParams.set("connection_limit", "1");
  const client = new PrismaClient({
    datasources: { db: { url: url.toString() } },
  });
  let stage = 5;
  try {
    await client.$connect();
    pass(5);
    stage = 6;
    await client.$transaction(
      async (tx) => {
        // SET affects this transaction only. All following SQL is SELECT/catalog reading.
        await tx.$executeRaw`SET TRANSACTION READ ONLY`;
        const rows = await tx.$queryRaw<Array<{ ok: number }>>`SELECT 1 AS ok`;
        if (rows[0]?.ok !== 1)
          throw new Error("Resultado de SELECT 1 inesperado");
        pass(6);
        stage = 7;
        result.schema = await inspectDatabaseSchema(tx);
        if (result.schema.differences.length)
          fail(7, "Divergências listadas no relatório de schema.");
        else
          pass(
            7,
            `${result.schema.tables} tabelas, ${result.schema.columns} colunas, ${result.schema.indexes} índices e ${result.schema.foreignKeys} chaves estrangeiras verificados.`,
          );
        if (
          !result.schema.migrationHistoryVerified ||
          result.schema.pendingMigrations.length
        )
          fail(
            8,
            "Histórico não comprovado ou migrations não registradas; nenhuma migration aplicada.",
          );
        else
          pass(
            8,
            "Histórico e checksums verificados; nenhuma migration pendente.",
          );
      },
      { timeout: 60000 },
    );
  } catch (e) {
    fail(stage, safeFailure(e));
  } finally {
    await client.$disconnect();
  }
  return result;
}
async function cloudContext() {
  const path = "/etc/codex/network-policy.json";
  if (!existsSync(path)) return undefined;
  try {
    const policy = JSON.parse(readFileSync(path, "utf8"));
    const proxy = new URL(policy.tcp_connect_proxy);
    let listener: Step;
    try {
      const socket = await tcp(proxy.hostname, Number(proxy.port));
      socket.destroy();
      listener = { name: "Listener TCP do ambiente", status: "APROVADA" };
    } catch (e) {
      listener = {
        name: "Listener TCP do ambiente",
        status: "FALHOU",
        detail: safeFailure(e),
      };
    }
    return {
      vpnConfigured: policy.vpn_configured,
      tcpNetworkAccess: policy.tcp_network_access,
      listener,
      note: "A lista HTTP não autoriza PostgreSQL. O transporte TCP documentado exige VPN e destinos IPv4 privados autorizados; não fornece rota direta aos endpoints públicos do Supabase.",
    };
  } catch {
    return {
      note: "Política de rede indisponível para inspeção; nenhuma permissão presumida.",
    };
  }
}
const targets: Target[] = [];
targets.push(
  await diagnose(
    process.env.SUPABASE_DATABASE_URL
      ? "SUPABASE_DATABASE_URL"
      : "DATABASE_URL",
    process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL,
  ),
);
targets.push(await diagnose("DIRECT_URL", process.env.DIRECT_URL));
const cloud = await cloudContext();
const report = {
  checkedAt: new Date().toISOString(),
  status: targets.every((t) => t.steps.every((s) => s.status === "APROVADA"))
    ? "APROVADA"
    : "FALHOU",
  authSecretPresent: Boolean(process.env.AUTH_SECRET),
  targets,
  ...(cloud ? { cloud } : {}),
};
mkdirSync("test-results", { recursive: true });
writeFileSync("test-results/supabase.json", JSON.stringify(report, null, 2));
console.log("Supabase:", JSON.stringify(report, null, 2));
if (report.status !== "APROVADA") process.exitCode = 1;
