import { spawnSync } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { assertTestDatabase } from "../tests/helpers/database";

const mode = process.argv[2];
const database = assertTestDatabase(process.env.TEST_DATABASE_URL);
const env = {
  ...process.env,
  DATABASE_URL: database,
  DIRECT_URL: database,
  AUTH_SECRET: randomBytes(32).toString("hex"),
  TEST_RUN_ID: `e2e_${randomUUID().replaceAll("-", "")}`,
  NEXT_TELEMETRY_DISABLED: "1",
  NODE_ENV: undefined,
  APP_URL: undefined,
  APP_ENV: undefined,
};
function run(args: string[]) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (!["integration", "e2e", "all"].includes(mode))
  throw new Error("Modo de teste inválido.");
run(["node_modules/prisma/build/index.js", "validate"]);
run(["node_modules/prisma/build/index.js", "generate"]);
run(["node_modules/prisma/build/index.js", "migrate", "deploy"]);
if (mode === "all") {
  run(["test", "tests/unit"]);
  run([
    "node_modules/typescript/bin/tsc",
    "--noEmit",
    "--incremental",
    "false",
  ]);
  run([
    "node_modules/typescript/bin/tsc",
    "--project",
    "scripts/tsconfig.marco7.json",
  ]);
  run(["node_modules/eslint/bin/eslint.js", "."]);
  run(["run", "build"]);
  run(["scripts/prepare-standalone.mjs"]);
  run(["scripts/test-production.ts"]);
}
if (mode !== "e2e") {
  run(["scripts/test-marco7.ts"]);
  run(["scripts/test-marco8.ts"]);
  run(["scripts/test-marco9.ts"]);
  run(["scripts/test-supabase-schema.ts"]);
}
if (mode !== "integration")
  run(["node_modules/@playwright/test/cli.js", "test"]);
