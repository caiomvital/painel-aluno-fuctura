import { productionConfiguration } from "../lib/production-config";
try {
  productionConfiguration();
  console.log("Configuração de produção: APROVADO. Valores não exibidos.");
} catch {
  console.error(
    "Configuração de produção: BLOQUEADO. Confira AUTH_SECRET, APP_URL e as URLs PostgreSQL no guia.",
  );
  process.exitCode = 1;
}
