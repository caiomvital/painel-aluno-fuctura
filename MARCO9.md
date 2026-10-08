# Marco 9 — experiência do diretor

O painel começa na Visão Geral e reúne seis áreas: Visão Geral, Turmas,
Professores, Alunos, Aulas e Presenças, Gamificação e Leilões. A navegação usa
uma grade adaptável ao celular. Os dados vêm de Prisma/PostgreSQL, com estados
de carregamento, erro, repetição da consulta e listas vazias.

## Gestão acadêmica

- Visão Geral: turmas ativas, alunos distintos com matrícula ativa, professores
  vinculados, próximas aulas, presenças e diários pendentes. Pendências abrem
  diretamente a aula ou as solicitações correspondentes.
- Turmas: cadastro, edição, curso, professor, dias, horário, duração, frequência
  semanal, datas e situação existente. Detalhes mostram alunos, cronograma,
  diários e acompanhamento pedagógico. Encerramento usa FINISHED; exclusão de
  turma com aulas ou matrículas é bloqueada.
- Professores: cadastro e edição pelo fluxo de autenticação existente, busca,
  atribuição/remoção de responsabilidade e cronograma. A troca do professor
  atual da turma preserva o professor registrado nas aulas anteriores.
- Alunos: cadastro, edição administrativa, busca por nome, filtros por turma e
  situação da matrícula, frequência, registros, XP e Coins. Matrículas usam
  ACTIVE, COMPLETED e DROPPED; a chave única bloqueia duplicidades. A interface
  administrativa não mistura edição de cadastro com ajustes financeiros.
- Aulas e Presenças: filtros por turma, professor, aula, período, diário e
  pendências; diário do Marco 7 e serviço transacional de presenças do Marco 8.
  Confirmação e rejeição atualizam os dados sem recarregamento manual.

Aulas programadas, com data passada e com conteúdo ministrado são informações
separadas. Percentual de diários considera somente aulas passadas não
canceladas; não existe percentual sem denominador. Frequência usa registros
resolvidos PRESENT/ABSENT/EXCUSED, sem transformar aulas sem registro em faltas.

O modelo relaciona módulos ao curso, não diretamente à turma. O painel consulta
os módulos do curso e preserva esse relacionamento; não há nova migration.

## Serviços e autorização

| Endpoint | Operações do Marco 9 |
| --- | --- |
| `/api/director/dashboard` | GET: indicadores e dados acadêmicos reais |
| `/api/director/classes` | POST/PUT existentes; validações, datas e proteção de histórico ampliadas |
| `/api/director/teachers` | Fluxos existentes de cadastro/edição, responsabilidade pelo PUT de turmas |
| `/api/director/students` | Cadastro/edição existentes; matrícula legada preserva registros |
| `/api/director/enrollments` | Novo POST para matrícula; PUT para situação existente |
| `/api/director/attendance` | Novo POST CONFIRM/REJECT usando a mesma transação do professor |
| `/api/lessons/[lessonId]` | Diário existente; mantém autorização do Marco 7 |
| `/api/director/coins` | Ajustes existentes, com proteção de valores reservados no serviço |
| `/api/director/auction` | GET autorizado sem seed demonstrativo; controles existentes e CLOSE_ITEM reutilizando encerramento |

Todos os endpoints exclusivos da direção validam a sessão e o papel DIRETOR.
O serviço de presenças verifica o ator real no PostgreSQL; professor continua
restrito às suas turmas e aluno não confirma nem rejeita solicitações. O DTO não
retorna hashes de senha. Os endpoints exclusivos do professor continuam com
suas permissões originais.

## Gamificação e leilões

Os controles de lotes, datas e configuração foram extraídos do painel anterior,
sem duplicar o motor do leilão. Ajustes manuais de XP e Coins continuam nos
serviços/ledgers existentes. Débitos de Coins bloqueiam a linha do aluno e
respeitam as reservas ativas; lotes com lances/reservas não são excluídos.
Encerramento reutiliza a transação existente e permanece idempotente. As regras
de recompensas, valores, proporção XP/Coins e cálculo dos lances são preservados.
Consulta administrativa não cria uma temporada ou itens fictícios. Uma escola
sem temporada apresenta esse estado e mantém os controles dependentes dela
desabilitados, conforme o domínio existente.

## Verificação

A mesma suíte `npm run test:all` executa os Marcos 7, 8 e 9, testes unitários,
Prisma validate/generate, TypeScript, ESLint, build e Playwright desktop/mobile.
Os testes do Marco 9 estão em `scripts/test-marco9.ts` e
`tests/e2e/director.spec.ts`. PostgreSQL isolado é obrigatório, inclusive para
operações financeiras. O workflow único de GitHub Actions usa PostgreSQL
17 temporário e publica relatórios, capturas e traces.

Não há escrita no Supabase compartilhado nem configuração de deploy. Não foram
adicionados uploads, notas, chat, folha de pagamento ou novas regras de jogos.
