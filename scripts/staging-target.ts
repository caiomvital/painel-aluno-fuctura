// Local metadata only; does not connect or write to PostgreSQL.
import { targetFingerprint } from "../lib/staging-target";
try {
  const runtime = targetFingerprint(process.env.DATABASE_URL ?? "");
  const direct = targetFingerprint(process.env.DIRECT_URL ?? "");
  console.log(
    JSON.stringify({
      runtimeTarget: runtime,
      directTarget: direct,
      sameTarget: runtime === direct,
    }),
  );
  if (runtime !== direct) process.exitCode = 1;
} catch {
  console.error("Destino não identificável; nenhuma conexão executada.");
  process.exitCode = 1;
}
