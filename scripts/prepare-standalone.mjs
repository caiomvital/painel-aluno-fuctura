import { cpSync, existsSync, mkdirSync } from "node:fs";
if (!existsSync(".next/standalone/server.js"))
  throw new Error("Execute o build antes de preparar os arquivos.");
mkdirSync(".next/standalone/.next", { recursive: true });
cpSync(".next/static", ".next/standalone/.next/static", { recursive: true });
cpSync("public", ".next/standalone/public", { recursive: true });
console.log("Standalone preparado com arquivos públicos e estáticos.");
