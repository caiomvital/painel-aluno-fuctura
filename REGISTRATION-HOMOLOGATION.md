# Cadastro na homologação publicada

## Mobile concluído em 09/10/2026

Execução `hmlcad-af705305-c13d-4392-8c57-e9b9c60dc104` concluída com
código de saída 0 no site publicado, em Chromium com emulação mobile Pixel 5,
toque e viewport 390×844 para todos os contextos, inclusive o diretor.
Cadastro, aprovação de aluno/professor pela interface, rejeição pela API,
login, painéis e recusas de permissões passaram nos mesmos cenários desktop.
Alvo publicado/runtime/direct conferidos; senha longa preservada e bloqueada;
três contas fictícias preservadas, sem matrícula automática ou limpeza.
TypeScript sem emissão e plano mobile também aprovados.
Esta evidência cobre emulação em Chromium; não representa teste em aparelho físico.

## Conclusão em 09/10/2026

Execução autorizada concluída com código de saída 0, usando os insumos
protegidos já disponíveis em `.env.registration-hml`, sem exibir credenciais.
O executor aceita autorização específica para o alvo conhecido, sem exigir
declaração de banco descartável ou inventário fictício. As pendências de sessão
e aprovação descritas nas inspeções anteriores estão superadas.

- Execução: `hmlcad-d9bee293-2b90-4e4b-aded-99ee7db008ec`.
- Fingerprints do site publicado, runtime e direct conferidos no alvo autorizado.
- Senha longa preservada, aviso exibido e envio bloqueado.
- Três cadastros fictícios: aluno e professor aprovados pela interface; terceiro
  rejeitado pela API existente. Login, painel e permissões verificados.
- Senha incorreta, login pendente/rejeitado, aprovação como DIRETOR, troca de
  perfil e acesso administrativo indevido recusados; aprovação repetida validada.
- Aluno sem matrícula e com XP/Coins zero antes do primeiro login aprovado;
  perfis indevidos ausentes nas consultas READ ONLY da execução.
- Contas de teste preservadas; nenhuma limpeza automática ou migration.

A primeira tentativa foi bloqueada pelo sandbox antes de iniciar o browser;
a execução concluída usou Chrome fora do sandbox. A primeira execução com escrita
foi desktop; a execução mobile posterior também concluiu os fluxos com escrita,
conforme o registro acima.

Inspeção em 08/10/2026: checkout limpo em `85ed60c`; systemd `fuctura-hml`
ativo/running com WorkingDirectory e ExecStart na release `85ed60c`.
GET HTTPS `/api/health/ready`: 200, `{"status":"ready"}`, ambiente staging.
Não foram executados login, cadastro, revisão, migrations ou limpeza no Supabase.
Readiness não substitui preflight nem comprova os fluxos de cadastro.

## Reutilização

`scripts/check-registration-published.ts` adapta os seletores e cenários de
`tests/e2e/registration.spec.ts`, usa Playwright já instalado, as mensagens e
validação de `lib/registration-input.ts` e a identificação/autorização de alvo
de `lib/staging-target.ts`. Não executa setup/teardown da suíte isolada.
O comando padrão apenas imprime o plano, sem browser, HTTP ou conexão PostgreSQL:

```sh
npm run staging:registration -- --plan
```

Para emular mobile em todos os contextos (diretor e cadastros), adicionar
`--mobile`: Chromium com toque, configuração Pixel 5 e viewport 390×844.
O modo desktop usa 1440×900. O plano informa o modo sem executar requisições.
Na execução com escrita, manter a confirmação específica do alvo:

```sh
npm run staging:registration -- --apply --mobile --confirm=TEST_REGISTRATION:REPLACE_APPROVED_TARGET_SHA256
```

O executor antigo `staging:published` exige Basic Auth; o ambiente atual não
possui essa barreira por decisão do usuário. `staging:fixtures` exige conjunto
exclusivo de fixtures e provisiona recursos fora do escopo de cadastro. Não
executar esses comandos de escrita no banco existente nem adaptar `test:all`
para o remoto. Contas administrativas existentes serão preservadas.

## Preparação para eventual nova execução

Carregar variáveis por mecanismo protegido do operador, fora do Git e sem
imprimir valores: APP_ENV=staging, APP_URL da origem abaixo, AUTH_SECRET,
DATABASE_URL, DIRECT_URL e CA TLS existentes. Fornecer sessão
STAGING_DIRECTOR_SESSION válida de diretor existente. O executor aceita a
confirmação específica do alvo conhecido; HOMOLOGATION_APPROVAL_FILE é opcional
e, quando fornecido, deve conter inventário verdadeiro conforme HOMOLOGATION.md.
Não criar outro diretor nem trocar senhas para repetir a verificação.

O projeto exclusivo do painel não implica banco vazio ou descartável. Revisar
o inventário de alvos/origens/segredos protegidos; não declarar isolamento
indevidamente para passar a guarda. Se a guarda bloquear o destino, interromper.
Obter fingerprint com `staging:target` no contexto seguro; o executor compara
runtime/direct com `/api/health/details` autenticado antes de qualquer POST.
Na inspeção inicial não foram carregadas as variáveis protegidas nem obtido fingerprint.

Definir HOMOLOGATION_REGISTRATION_PASSWORD exclusiva dos testes: 6–8 caracteres
e ao menos um número. Não reutilizar senha real. Chromium precisa estar
disponível para Playwright ou indicado por PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH.
Validar schema/preflight somente leitura antes da execução. Não há necessidade
de deploy, mudança de regras ou migration para este executor local.

Origem fixa: https://fuctura-hml.69.169.102.111.sslip.io.
O comando abaixo é um modelo para nova execução, que depende de autorização
específica para esse alvo e as escritas descritas. As execuções concluídas estão
registradas no início deste documento:

```sh
npm run staging:registration -- --apply --confirm=TEST_REGISTRATION:REPLACE_APPROVED_TARGET_SHA256
```

## Escritas e evidências

- Três contas fictícias únicas por execução `hmlcad-<uuid>-{student,teacher,rejected}@example.test`:
  User, Profile e RegistrationRequest pelo formulário público.
- Duas aprovações pelo diretor na interface (Aluno/Professor), uma rejeição pela
  API existente, com status, responsável e data de revisão.
- Aprovação Aluno cria Student e seu streak; Professor cria somente Teacher.
  Não haverá matrícula automática, criação de turma, temporada ou leilão.
- Login aprovado de aluno pode criar PointTransaction/CoinTransaction e alterar
  XP, Coins e nível conforme XP_LOGIN vigente. Nenhuma regra será modificada.
- Chamadas negativas (pendente, senha incorreta, aprovação DIRETOR, troca de
  perfil, autorização insuficiente) devem ser recusadas sem alterações de domínio.
  Há efeitos operacionais normais em cookies, limitadores e logs HTTP.

O executor verifica senha longa sem truncamento, mensagem pendente, senha errada,
aprovação explícita, idempotência, impossibilidade de trocar perfil, rejeição,
endpoints de painel e autorização. SQL usa transações READ ONLY e seleciona
apenas contas da execução para conferir ausência de perfis indevidos e matrícula,
e saldos zero antes do primeiro login aprovado. Não forja JWT nem exporta hashes.

Relatório stdout contém identificador, fingerprint, e-mails fictícios e etapas
concluídas; não contém senha, cookie ou detalhes das contas reais. Não grava
traces/screenshots, pois telas do diretor podem conter dados existentes.
O fluxo foi executado ponta a ponta na homologação em desktop e emulação mobile,
conforme os registros no início deste documento. Em nova execução, relatório
parcial/falha não comprova sucesso. O padrão é desktop; --mobile seleciona a
emulação mobile.

Não há limpeza automática, reset, seed ou alteração de contas preexistentes.
Falha pode deixar dados parciais: preservar o relatório, consultar somente as
contas listadas e revisar antes de repetir (nova execução cria outras três).
Eventual exclusão posterior requer autorização própria e revisão de dependências.

## Histórico: execução parcial em 08/10/2026 após autorização do usuário

As pendências desta seção foram superadas pelas execuções de 09/10/2026.

- Release `85ed60c` ativa; readiness HTTPS 200/ready.
- Playwright contra o site publicado, Chrome instalado em `/opt/google/chrome/chrome`:
  desktop 1440×900 e mobile 390×844 aprovados. Link de cadastro, senha longa
  sem truncamento, mensagem exata, envio desabilitado e reabilitação com senha
  válida. Interceptação bloqueou qualquer método diferente de GET/HEAD; nenhum
  POST foi tentado. Não houve login nem criação de conta.
- Configuração protegida carregada pelo operador de execução sem exibir segredos.
  Fingerprints runtime/direct iguais:
  `689c60925ff3bf1915ddbeae49d85a82ce41d0143b2d1f0c109f7b358ba60d12`.
- Preflight READ ONLY aprovado em ambas as conexões: 23 tabelas, 200 colunas,
  58 índices e 27 FKs; sem divergências ou migrations pendentes; histórico verificado.
- Fluxos com escrita ainda não executados: não estão disponíveis nesta sessão
  STAGING_DIRECTOR_SESSION nem arquivo de aprovação com inventário real protegido.
  Não foram criados inventários fictícios nem tokens assinados para contornar login.
  É necessário fornecer os caminhos protegidos desses insumos para concluir.

## Histórico: nova verificação em 08/10/2026

As pendências desta seção foram superadas pelas execuções de 09/10/2026.

- Bun localizado em `/opt/painel-fuctura-tools/node_modules/.bin/bun`.
- Suíte unitária: 58 testes aprovados, zero falhas, com AUTH_SECRET temporário
  aleatório exclusivo do processo local (sem usar o segredo da homologação).
- TypeScript sem emissão aprovado; formulário publicado aprovado em desktop
  1440×900 e mobile 390×844, com requisições de escrita bloqueadas.
- systemd confirma release `85ed60c` e configuração em `/etc/fuctura-hml.env`.
- Preflight READ ONLY novamente aprovado nas duas conexões: 23 tabelas,
  200 colunas, 58 índices, 27 FKs, nenhuma divergência ou migration pendente.
- Configuração do serviço não contém STAGING_DIRECTOR_SESSION,
  HOMOLOGATION_APPROVAL_FILE ou HOMOLOGATION_REGISTRATION_PASSWORD.
  Execução publicada com cadastro/aprovação/rejeição permanece pendente dos
  insumos protegidos; nenhuma conta foi criada ou alterada nesta verificação.
