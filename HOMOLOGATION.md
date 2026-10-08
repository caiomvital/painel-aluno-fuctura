# Marco 10 / Etapa 2A — preparação da homologação

**Esta etapa prepara o ambiente; não executa deploy, migrations remotas, criação de contas, testes publicados ou Etapa 2B.** O procedimento operacional base permanece em [DEPLOYMENT.md](DEPLOYMENT.md). Este documento acrescenta isolamento, dados fictícios, roteiro e evidências de homologação; não substitui os controles da Etapa 1.

## 1. Plano e infraestrutura

Sequência de liberação: definir destino isolado → autorizar sua criação fora desta tarefa → configurar segredos/HTTPS/restrição → validar leitura/backup/restauração → autorizar migrations isoladas → preparar release → autorizar deploy de homologação → autorizar dados fictícios → executar roteiro → registrar evidências/pendências. Conexão, readiness ou CI verdes isoladamente não encerram a homologação.

| Requisito | Evidência para prosseguir |
| --- | --- |
| Banco/projeto de homologação separado | Responsável confirma projeto próprio, sem dados reais, host/usuário/DB e identificação independente do compartilhado |
| Credenciais e segredo JWT exclusivos | Cofre/arquivo externo 0600, chave aleatória distinta, nenhuma credencial ou sessão de produção reutilizada |
| VPS/OS/usuário/portas/diretórios | Inventário autorizado; Node 24, Bun 1.4.2 para tooling, PostgreSQL client compatível, Nginx/systemd |
| Origem de homologação HTTPS | Domínio/subdomínio e porta externa definidos, DNS/certificado/renovação/firewall comprovados |
| Restrição adicional | Nginx Basic Auth ou rede/VPN autorizada, cobrindo páginas, APIs, health, assets e PWA; bloqueio externo comprovado |
| Isolamento de operação | Diretório, unidade, porta, logs, credenciais e backup próprios; se co-hospedar, também nomes únicos de log_format/limit_req_zone Nginx |
| Backup/restauração | Backup criptografado, retenção/RPO/RTO/responsável e restauração testada em cópia sem dados pessoais reais |

Se existir somente o Supabase compartilhado, **parar e solicitar autorização para criar um projeto/banco separado**. Não criar schema `staging` dentro dele automaticamente. Não importar dump com pessoas reais para homologação. Restaurar/testar recuperação usando dados fictícios e o mesmo schema. O acesso HTTP liberado no Codex não concede TCP PostgreSQL; nesta sessão não há VPN/concessão TCP. Executar as leituras da máquina autorizada quando disponível, sem contornar a política.

Variáveis adicionais em `.env.example`: `APP_ENV=staging`, `HOMOLOGATION_APPROVAL_FILE`, `HOMOLOGATION_APP_STOPPED`, `HOMOLOGATION_ACCOUNT_PASSWORD`, `HOMOLOGATION_BASE_DATE`, `HOMOLOGATION_AUCTION_ENDS_AT`, `STAGING_GATE_USER`, `STAGING_GATE_PASSWORD`, `STAGING_DIRECTOR_SESSION`. **`NODE_ENV` continua `production`**, para testar o build/cookies reais. `APP_URL` é a origem HTTPS exata de homologação. Não usar `test:all` contra este banco remoto: a suíte continua exclusivamente loopback `_test`.

## 2. Validação do Supabase — somente leitura

Carregar variáveis pelo mecanismo protegido descrito no guia base, sem argumentos com URLs/senhas. Confirmar qual arquivo foi selecionado antes dos comandos:

```sh
npm run check:production
npm run staging:target
npm run test:supabase
npm run preflight
npx prisma migrate status
```

`staging:target` apenas calcula fingerprints SHA-256 não secretos das identidades; não conecta. Em Supabase, conexão direta e pooler devem identificar o mesmo projeto/banco; senha/porta do pooler não mudam a identidade. PostgreSQL local exige banco `_test` ou `_homologation`. URLs de schema alternativo ou sobrescrita `host=` são recusadas pela guarda de dados fictícios.

O diagnóstico existente (`test:supabase`) testa, em ordem: variável/formato, DNS, TCP, TLS/certificado, autenticação, SELECT 1, tabelas/schema/migrations. O `preflight` compara ambos os caminhos em transações READ ONLY, incluindo tabelas/colunas/enums/índices/chaves/checksums. `migrate status` é leitura do histórico; pendências podem produzir exit code não zero. Guardar JSON/status e commit, **nunca** credenciais, screenshots de segredos ou dumps públicos. As verificações somente leitura também podem ser executadas no banco compartilhado com autorização de acesso; não usar lá nenhum comando de escrita deste guia.

Se DNS/TCP falhar: registrar etapa/código, verificar família IPv4/IPv6 e política de rede. Se TLS falhar: verificar cadeia/CA/hostname, sem desabilitar validação. Se autenticação falhar: confirmar usuário/pooler no próprio painel; não concluir que a senha é a causa sem evidência. Se schema/histórico divergir: interromper, revisar SQL/checksums, restaurar cópia isolada e preparar correção com autorização específica. Não apagar histórico nem executar db push/reset/seed como atalho.

## 3. Migrations, backup e restauração

Ordem lexical do Prisma existente, sem migration nova nesta etapa:

1. `20260929_init`
2. `20261005_academic_schema_update`
3. `20261006_auction_and_coins_migration`
4. `20261006_coin_reservation_unique_active_per_item`
5. `20261006_point_transaction_unique_origin_ref`

Conferência local segura:

```sh
rg --files prisma/migrations -g migration.sql | sort
sha256sum prisma/migrations/*/migration.sql
npx prisma validate
```

O último SQL atualiza referências legadas antes do índice único: a revisão de impacto não deve tratar todas as migrations como alterações somente estruturais. O inspector existente confere checksums contra `_prisma_migrations`; não editar SQL já aplicado para forçar aprovação.

Usar os comandos `pg_dump`, `pg_restore --list`, checksum e restauração do [guia base, seção 5](DEPLOYMENT.md#5-backup-e-recuperação). Configure serviços PostgreSQL distintos `fuctura_homologation` e `fuctura_restore` em arquivos protegidos, com TLS verificado. A restauração de prova altera somente uma cópia isolada. Provar recuperação do schema, contagens fictícias e invariantes antes da aplicação. Confirmar plano de backup do Supabase; não presumir PITR disponível.

**Escrita futura, somente após autorização explícita e confirmação do banco isolado:**

```sh
npx prisma migrate status
npx prisma migrate deploy
npm run preflight
```

Antes de `deploy`, confrontar fingerprint com o alvo de homologação aprovado, conferir que não está no inventário protegido e guardar autorização/backup/restauração/SQL revisado. Não há wrapper que aplica migrations automaticamente. Para banco vazio, ausência de histórico/schema é uma pendência esperada, não motivo para ignorar o gate: autorizar o bootstrap isolado separadamente e depois exigir preflight verde. Nunca aplicar essas migrations no Supabase compartilhado nesta etapa.

## 4. Aprovação do alvo e dados fictícios — mecanismo não executado

Copiar `deploy/staging-approval.example.json` para **fora do Git**, preencher e proteger como 0600. Inventário deve incluir TODOS os destinos/origens/segredos de produção e compartilhados conhecidos. Gerar fingerprints usando `staging:target` em cada contexto escolhido, sem conectar ou exibir URL. Hash do segredo protegido pode ser obtido no contexto de produção pelo operador sem revelar seu valor:

```sh
bun -e 'import {createHash} from "node:crypto"; if(!process.env.AUTH_SECRET)process.exit(1); console.log(createHash("sha256").update(process.env.AUTH_SECRET).digest("hex"));'
```

Armazenar só o hash no inventário de homologação. Isso **não** significa copiar o segredo de produção para o arquivo de homologação. A completude/verdade do inventário depende da revisão do responsável; as guardas não descobrem automaticamente todos os bancos de uma organização.

Arquivo de aprovação: version=1, environment=staging, isolated=true, shared=false, alvo SHA-256, origem HTTPS, listas não vazias de destinos/origens/segredos protegidos. A guarda recusa ambiente de produção, alvo divergente/protegido, conexões para projetos diferentes, segredo/origem compartilhados e confirmação incorreta. Não alterar o arquivo para contornar uma recusa.

Configurar `HOMOLOGATION_ACCOUNT_PASSWORD` exclusivo das contas fictícias (12 caracteres mínimos, 72 bytes UTF-8 máximos), `HOMOLOGATION_BASE_DATE` YYYY-MM-DD, `HOMOLOGATION_AUCTION_ENDS_AT` ISO futuro e `HOMOLOGATION_APPROVAL_FILE`. Escolher data base para permitir aulas passadas/futuras no roteiro. Senha não é exibida nem gravada em relatórios; a guarda recusa placeholders, senha padrão pública e reutilização do segredo JWT. Não usar senha real de outra pessoa.

**Antes de apply:** manter a aplicação de homologação parada (ou ainda não iniciada), conferir com `systemctl is-active fuctura-staging` e confirmar `HOMOLOGATION_APP_STOPPED=1` apenas no contexto do provisionamento. Isso evita login/presença concorrentes à inicialização dos baselines. Remover a variável após a operação; iniciar o serviço somente após revisar resultado. O script exige a confirmação, mas a evidência real da parada é responsabilidade do operador.

**Comandos futuros, não executados nesta tarefa:**

```sh
npm run staging:fixtures -- --plan
npm run staging:fixtures -- --apply --confirm=CREATE_FICTIONAL_DATA:REPLACE_APPROVED_TARGET_SHA256
```

O plano não conecta; apply só começa após guardas/confirmacão. Antes de escrever, verifica schema/histórico e recusa contas/cursos/turmas fora do conjunto. Lock transacional PostgreSQL impede provisionamentos concorrentes. Dados mínimos: diretor, professor, dois alunos `@example.test`; curso, turma, três aulas, duas presenças pendentes, diário, uma temporada fictícia e link público `https://example.com/`.

Cadastros/matrículas/diário/presenças/baselines usam os serviços existentes. Não há serviço de bootstrap de diretor, curso, temporada ou criação de aula: somente esses registros relacionais mínimos são criados via Prisma, com perfis/FKs; nenhum saldo, ledger, recompensa ou confirmação é inserido manualmente. Registros já existentes são reutilizados; senhas e matrículas alteradas não são sobrescritas; diários/solicitações resolvidos não são reabertos. A tela atual edita temporadas existentes, mas não cria a primeira em banco vazio: o bootstrap autorizado cria somente uma temporada fictícia com defaults do modelo e término futuro informado. Não cria lotes/lances/reservas nem encerra/reabre temporada existente. Criar itens pelos controles atuais; quando necessário ao teste de lance, conceder Coins fictícias pelos ajustes administrativos existentes, registrando ledger/motivo e XP antes/depois.

As transações dos serviços são independentes: falha pode deixar conjunto parcial. Não há rollback destrutivo automático; após revisar/corrigir a causa, repetir no mesmo alvo/namespace retoma os registros. Rodar antes dos testes manuais que criem novas contas/turmas, pois recursos fora do conjunto bloqueiam nova execução. A criação não equivale à aprovação funcional. **As guardas foram testadas sem executar o mecanismo de criação nesta tarefa.**

## 5. Publicação futura e verificação automatizada

Seguir [DEPLOYMENT.md](DEPLOYMENT.md), com comandos VPS complementares da seção 15. Os modelos têm placeholders; acesso/OS/domínio/portas não são presumidos. Publicação só após autorização futura.

Incluir `deploy/staging-access.conf.example` dentro do server HTTPS renderizado a partir de `nginx.conf.example`. Basic Auth herdada deve cobrir inclusive `/api/auth/login`, `/api/health/*`, `/_next` e PWA; não liberar essas locations. Alternative: rede/VPN com evidência de bloqueio externo. `APP_ENV=staging` adiciona `X-Robots-Tag` e robots Disallow, **mas não restringe acesso**. Validar restrição adicional antes de expor o host. `X-Fuctura-Environment` identifica staging; fingerprints aparecem somente em health details autenticado como DIRETOR.

**Automação publicada: não executada nesta tarefa.** Com Basic Auth configurada:

```sh
npm run staging:published
```

Modo padrão somente GET: valida TLS via cliente confiável, barreira sem credenciais=401, acesso autorizado, readiness, anti-indexação, robots, manifest/ícones declarados, assets, SW e detalhes operacionais sem sessão=401. Não segue redirects com credenciais. Não verifica automaticamente instalação PWA, logout/troca de usuário offline, fluxos financeiros completos ou integridade remota.

Modo separado, **escrita possível de XP por login do aluno**, somente banco isolado e autorização explícita:

```sh
npm run staging:published -- --authenticate --confirm=CREATE_FICTIONAL_DATA:REPLACE_APPROVED_TARGET_SHA256
```

Usa apenas emails fixos fictícios, senha fictícia e Basic Auth em variáveis protegidas. Exige primeiro `STAGING_DIRECTOR_SESSION`, uma sessão obtida manualmente após login do diretor fictício no domínio de homologação e armazenada diretamente no mecanismo protegido (nunca em relatório/chat). Faz GET de health details e confronta fingerprints do banco efetivamente usado pelo servidor com o manifesto **antes de qualquer login automatizado**; só então testa login dos três perfis. Sessão recusada ou alvo divergente interrompem sem login ou prêmio automático. Verifica cookies seguros, acesso/recusa administrativa e logout sem salvar cookies/tokens. Não aceitar check positivo como homologação completa. O modo automático é específico da barreira Basic; opção VPN deve ter verificação externa equivalente registrada pelo operador.

| Categoria | Comando/ação | Escrita |
| --- | --- | --- |
| Local isolado | `TEST_DATABASE_URL=..._test npm run test:all` | Só PostgreSQL loopback guardado; migrations/fixtures existentes da suíte |
| Banco compartilhado | `test:supabase`, `preflight`, migrate status | Somente leitura |
| Homologação isolada | Apply de migrations e `staging:fixtures --apply` | Exige autorização do alvo; nunca automático |
| Publicada básica | `staging:published` | GET somente leitura |
| Publicada autenticada | `staging:published --authenticate` e roteiro | Login de aluno pode conceder XP; ações do roteiro escrevem no isolado |

## 6. Roteiro funcional verificável

Registrar para cada linha: executor/data, commit, perfil fictício, ID não sensível do recurso, pré/ação/pós, resultado real, evidência sanitizada e status APROVADO/PENDENTE/BLOQUEADO/NÃO EXECUTADO. Não anexar passwords, cookies, tokens, hashes de senha ou dados reais. Capturas de tela não devem mostrar áreas de segredos. Pré-condição comum: HTTPS/restrição/readiness/preflight verdes, backup comprovado, quatro contas fictícias e dados do conjunto criados com autorização. Dispositivo desktop e mobile.

| Perfil/operação | Pré-condição | Ação | Resultado esperado | Evidência e critério de aprovação |
| --- | --- | --- | --- | --- |
| Aluno: login | Conta fictícia/senha válida | Entrar; repetir no mesmo dia | Sessão segura; XP de login no máximo uma vez | HTTPS/cookie flags sem valor + delta/ledger; nenhuma duplicidade |
| Aluno: matrícula | Matrícula ACTIVE | Consultar dados | Turma/curso/situação corretos | Tela e IDs comparados à leitura autorizada |
| Aluno: cronograma | Três aulas cadastradas | Consultar anteriores/futuras | Datas/horários/planejados reais | Tela + consulta de leitura correspondentes |
| Aluno: presença | Matrícula ativa/aula elegível | Solicitar própria presença | Pendência da aula correta; sem prêmio antes da confirmação | ID/status e saldos antes/depois iguais |
| Aluno: XP | Baseline/ledgers existentes | Consultar após login/presença | XP/nível coerentes com regras atuais | Deltas/ledgers sem ajuste indevido |
| Aluno: Coins | Saldo/reservas reais do isolado | Consultar disponível/reservado | Disponível = saldo menos reservas ativas, não negativo | Leitura de saldos e reservas + tela |
| Aluno: ranking | Dois alunos cadastrados | Consultar ranking | Posição baseada em XP atual, sem mocks | Tela e ordenação de leitura |
| Aluno: leilão | Temporada fictícia do bootstrap; diretor criou lotes pelos controles atuais | Lance válido, inválido e superior | Reserva correta; recusas não alteram saldo/XP | IDs/deltas/ledgers e respostas sanitizadas |
| Aluno: extrato | Operações anteriores | Consultar movimentos | Cada operação aparece uma vez | Origem/valor/status coerentes, sem hash/token |
| Aluno: diário/materiais | Diário registrado | Abrir aula e link | Conteúdo somente de turma matriculada; sem edição | Tela/link HTTP(S) com noopener/noreferrer |
| Professor: login/Visão Geral | Responsabilidade pela turma | Entrar | Próxima aula/indicadores/pendências reais | Comparação com datas/diários/presenças |
| Professor: Minhas Turmas/alunos | Turma atribuída/matriculada | Abrir turma/alunos | Só turma própria e dados pedagógicos necessários | Tela e autorização backend |
| Professor: cronograma | Aulas existentes | Abrir anterior/futura | Aula passada não vira realizada automaticamente | Datas versus diário/status registrados |
| Professor: diário/materiais | Aula própria | Cadastrar/editar tópicos/link, salvar e reabrir | Persistência e indicadores atualizados | Antes/depois/reconexão sem XP/Coins alterados |
| Professor: confirmar | Presença PENDING do aluno 1 | Confirmar e repetir | Uma recompensa; segunda confirmação sem novo crédito/streak | Status/deltas/ledgers/streak comparados |
| Professor: rejeitar | Presença PENDING do aluno 2 | Rejeitar e tentar confirmar | Rejeição sem recompensa; confirmação resolvida recusada | Saldos/ledgers inalterados e estado correto |
| Professor: turma alheia | Diretor criou outra turma sem este professor | Tentar API/diário/presença da outra turma | 403, sem leitura/escrita | Resposta sanitizada + dados antes/depois iguais |
| Diretor: login/indicadores | Conta DIRETOR | Abrir seis áreas/Visão Geral | Totais operacionais reais | Contagens de leitura versus telas |
| Diretor: turmas | Curso válido | Criar/editar/vincular professor | Relações persistidas; histórico mantido | Reabertura/cronograma e leitura pós-operação |
| Diretor: professores | Nome/email fictícios/senha própria | Cadastrar/editar/atribuir/remover turma | Dados permitidos; histórico preservado; sem hashes | Respostas/telas sem passwordHash e relações corretas |
| Diretor: alunos | Dados fictícios próprios | Cadastrar/buscar/editar | Dados acadêmicos persistem | Busca/filtros e leitura correspondente |
| Diretor: matrículas | Aluno/turma válidos | Matricular, duplicar, alterar situação permitida | Duplicidade bloqueada; histórico preservado | Uma relação e resposta de recusa, sem prêmio |
| Diretor: cronogramas/diários | Aulas existentes | Filtrar turma/professor/período; editar diário | Filtros e conteúdo persistido | Resultados versus registros de leitura |
| Diretor: presenças | Novas pendências planejadas no isolado | Confirmar/rejeitar | Mesma transação e recompensa única do docente | Ledgers/deltas; duplicidade e rejeição sem prêmio |
| Diretor: XP/Coins | Aluno/saldo/reservas conhecidos | Ajustes manuais permitidos | Ledgers reconciliados; Coins reservadas protegidas | Motivo/delta/ledger, sem regra nova |
| Diretor: leilões | Temporada/lotes configurados no isolado | Criar/editar/lances/encerrar conforme UI atual; repetir encerramento | Gasto/reserva uma vez, XP inalterado | Status/ledgers/saldos antes/depois |
| Todos: perfis/dados alheios | Sessões dos três perfis | Professor/aluno acessam direção; aluno tenta studentId alheio | 403/401 ou retorno exclusivamente próprio; nenhuma escrita | HTTP real + comparação de IDs/status e ledgers |
| Todos: mobile/reconexão | Telas carregadas e alterações salvas | Reabrir no celular/reiniciar conexão | Navegação útil e persistência verdadeira | Capturas sanitizadas + leitura/reabertura |

Testes automatizados locais existentes verificam matrícula duplicada, professor alheio, isolamento do aluno, confirmação concorrente/repetida, rejeição, XP/Coins/ledgers, reservas e encerramento idempotente. Não exportar seus scripts de escrita para executar no Supabase: reproduzir o roteiro isolado autorizado. Acesso DIRETOR deve permanecer limitado às operações existentes, sem folha/financeiro escolar ou alterações fora do domínio.

## 7. Segurança e PWA publicada

Segurança: TLS/cadeia/renovação válidos; porta Node somente loopback; barreira adicional comprovada de fora e de dentro; cookies HttpOnly/Secure/Lax host-only; sessão expira/assinatura inválida/perfil alterado negados; mutações de outra origem bloqueadas por CSRF; tentativas inválidas limitadas com 429; erros sem stack/credenciais; nenhum segredo nas respostas/bundles; health público somente status, details só DIRETOR; noindex em páginas/APIs/assets e robots Disallow. Não confiar em robots para acesso. Não enfraquecer controles por conflito com Basic Auth/PWA; validar rede autorizada como alternativa quando necessário.

PWA: abrir em HTTPS no desktop e celular; conferir manifest/id/start_url/scope/ícones; instalar e abrir fora do navegador; confirmar usuário/perfil correto; conferir ativação/atualização SW depois de trocar release e fechar/reabrir clientes. O cache só aceita ícones públicos. Testar logout e troca entre dois usuários: nenhuma página/API/sessão/identidade anterior pode ser reapresentada. Desligar rede: ícones podem persistir; consultas dependem da rede; presença/lance devem falhar claramente sem alteração posterior ou recompensa/gasto oculto. Não há fila offline nem automação financeira offline. Registrar versão do browser/OS, screenshots sem tokens e resultado de rede; automação básica não prova instalação ou atualização real de PWA.

## 8. Atualização, rollback e encerramento

Usar [guia base, seções 12–13](DEPLOYMENT.md#12-atualização), por release/commit e com schema compatível. Unidade/diretórios de staging distintos; manter barreira adicional e noindex em rollback. Não voltar a versão vulnerável sem mitigação. Banco isolado também exige backup comprovado; não apagar fixtures/resetar/restaurar automaticamente para esconder falhas. Registrar plano e autorização para eventual restauração.

Encerrar preparação com testes locais/CI/evidências e pendências. Encerrar **homologação executada** somente com todas as linhas relevantes aprovadas no ambiente publicado, segurança/PWA reais verificadas e responsável assinando o registro. Pendências atuais externas: banco separado/criação autorizada, credenciais/segredo próprios, inventário/manifesto, VPS/OS/portas, domínio/HTTPS/restrição, leitura remota, backup/restauração, autorização de migrations/deploy/fixtures e execução publicada. Não iniciar Etapa 2B automaticamente.
