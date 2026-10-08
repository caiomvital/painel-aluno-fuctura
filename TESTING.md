# Testes automatizados

Requisitos: Node.js 24, Bun 1.4.2, PostgreSQL 17 e Chromium do Playwright.
Nenhuma conexão de CI aponta para o Supabase e nenhum deploy é executado.

## Banco descartável

Uma opção para iniciar o PostgreSQL de testes:

```sh
docker run --rm --name fuctura-tests \
  -e POSTGRES_USER=fuctura_test \
  -e POSTGRES_PASSWORD=local-tests-only \
  -e POSTGRES_DB=fuctura_local_test \
  -p 127.0.0.1:5433:5432 postgres:17
```

Em outro terminal, na raiz do checkout:

```sh
export TEST_DATABASE_URL=postgresql://fuctura_test:local-tests-only@127.0.0.1:5433/fuctura_local_test
bun install --frozen-lockfile
bunx playwright install --with-deps chromium
npm run test:all
```

O banco é exclusivo para testes. Para apagá-lo, pare o contêiner acima; não há volume persistente.
Os scripts exigem host loopback, protocolo PostgreSQL e nome terminado em `_test`.
`DATABASE_URL` e `DIRECT_URL` são substituídas pela conexão de testes nos subprocessos.
As migrations são aplicadas somente após essa validação. Não forneça credenciais reais.
O nome `_test` não transforma um banco compartilhado em descartável: crie um banco exclusivo.

## Comandos

- `npm run test:unit`: testes de parsing e das proteções do banco, sem escrita.
- `npm run test:integration`: migrations no banco autorizado e suíte de serviços existente (17 verificações).
- `npm run test:e2e`: prepara dados próprios e executa Chromium com login real e PostgreSQL real.
- `npm run test:all`: Prisma validate/generate, migrations, unitários, TypeScript da aplicação e da suíte, ESLint, build, integração e E2E.
- `npm run test:supabase`: diagnóstico separado e somente de leitura da conexão Supabase configurada em `SUPABASE_DATABASE_URL` ou `DATABASE_URL`.

Os comandos de integração/E2E exigem `TEST_DATABASE_URL`. Playwright inicia uma aplicação
própria na porta 3100 e recusa reutilizar um servidor já iniciado. Desktop e mobile têm
fixtures separadas. Os testes de serviços criam e removem seus registros; E2E usa
setup/teardown com IDs exclusivos por execução. Se o processo for interrompido à força,
descarte o banco local antes da próxima execução.

Em ambientes com Chromium instalado e download restrito, defina
`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium`. Na CI, usa-se o navegador
instalado pelo Playwright. Não desative verificação TLS para baixar navegadores.

## Marco 8 — professor

O mesmo `npm run test:all` executa `scripts/test-marco8.ts` depois do Marco 7.
A integração verifica escopo por professor, IDs forjados, diário persistido,
confirmações simultâneas/duplicadas, rejeição sem recompensa e reconciliação dos
ledgers. `tests/e2e/teacher.spec.ts` cobre as cinco áreas, próxima aula, cronograma,
tópicos e links, filtros, confirmação/rejeição, indicadores e frequência em desktop
e mobile, com login e PostgreSQL reais. Fixtures ficam exclusivamente no banco
isolado; nenhum comando desta suíte usa o Supabase compartilhado.

## Cobertura e artefatos

E2E valida os papéis professor, aluno e diretor em 1440×900 e 390×844, recarregamento,
edição/exclusão, permissões por interface e HTTP autenticado, campos acessíveis,
ausência de overflow da página e erros JS/HTTP/transporte inesperados.
Respostas 401 iniciais de sessão e recusas 403 intencionais são resultados esperados.
Não há mocks de autenticação ou persistência.

Screenshots dos três papéis e traces ficam em `test-results/`; o relatório HTML fica
em `playwright-report/`. Os artefatos contêm apenas credenciais e dados descartáveis
de teste e não são versionados. Screenshots servem à revisão; não atestam qualidade estética.

O diagnóstico Supabase nunca executa migrations, seeds ou escritas. Testa conexão,
colunas/tipos/nulabilidade e leituras essenciais. Sem acesso real, registra a etapa `FALHOU` e as etapas dependentes `NÃO EXECUTADA`
em `test-results/supabase.json`, com código de saída 1; isso não significa aprovação.
Veja [SUPABASE.md](SUPABASE.md) para TLS, tipos de pooler, limites de rede e plano
de migrations posterior com backup e autorização.

## CI

`.github/workflows/tests.yml` executa em PRs e pushes para `main`, com PostgreSQL
temporário próprio, e publica relatórios, screenshots e traces mesmo após falhas.
O resultado local não comprova a execução no GitHub Actions: consulte a execução
associada ao commit/PR. O workflow não contém deploy nem credenciais do Supabase.
