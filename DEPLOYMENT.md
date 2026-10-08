# Preparação para produção — Marco 10 / Etapa 1

Este guia prepara uma implantação controlada. **Não autoriza deploy nem mudanças no Supabase compartilhado.** Não há deploy automático na CI. A homologação do banco de destino, o backup com restauração comprovada e a aprovação do operador são pré-requisitos externos.

## 1. Pré-requisitos e escolhas do operador

Escolha e registre distribuição Linux com systemd, usuário de serviço sem privilégios, diretório de releases, domínio, IP, portas HTTP/HTTPS e porta interna livre. Não há valores reais presumidos nos modelos em `deploy/`. Use Node.js **24.x**, Bun **1.4.2** para instalação com lockfile/testes/scripts, PostgreSQL compatível com as migrations (suíte: PostgreSQL 17), Nginx e uma autoridade de certificados confiável. A aplicação roda em um processo Node; Bun não gerencia o serviço. Não instalar Docker ou outro supervisor em paralelo.

Os modelos não foram instalados em servidor e precisam ser validados na distribuição escolhida. A Etapa 1 não estabelece DNS, certificado, firewall, VPN ou acesso remoto. Não executar testes que escrevem usando URLs do Supabase compartilhado.

## 2. Ambiente e segredos

Use `.env.example` como catálogo, não como arquivo pronto. Não versionar `.env`, dumps, certificados privados ou tokens. Mantenha o arquivo de ambiente fora dos releases, com acesso somente do operador e do usuário de serviço (`0600`). Não inserir credenciais em comandos, histórico, relatórios ou tickets. Ao configurar valores especiais na senha PostgreSQL, usar percent-encoding no componente da URL.

| Variável | Produção | Desenvolvimento | Testes |
| --- | --- | --- | --- |
| `AUTH_SECRET` | Obrigatória: segredo próprio aleatório, mínimo 32 caracteres; preferir 32 bytes aleatórios codificados em hex | Obrigatória; usar segredo local distinto | Gerada pelo runner |
| `APP_URL` | Obrigatória: origem HTTPS exata, sem caminho/query/credenciais | Opcional; mesma origem HTTP local | Origem HTTPS fictícia no teste de produção; servidor local nos E2E |
| `DATABASE_URL` | Obrigatória: conexão de runtime, pool limitado, TLS validado remoto | PostgreSQL local ou destino autorizado | Sobrescrita por `TEST_DATABASE_URL` |
| `DIRECT_URL` | Obrigatória: conexão direta ou Session Pooler, nunca Transaction Pooler | Pode ser igual à URL local | Sobrescrita por `TEST_DATABASE_URL` |
| `TEST_DATABASE_URL` | Não configurar no serviço | Apenas banco descartável de testes | Obrigatória: loopback e banco com sufixo `_test` (ou nome CI permitido pelo guard) |
| `NODE_ENV` | `production` | Gerenciada pelo Next | Gerenciada pelo runner |
| `HOSTNAME`, `PORT` | `127.0.0.1` e porta interna escolhida | Opcionais | Portas locais de teste |
| `NEXT_TELEMETRY_DISABLED` | Opcional: `1` | Opcional | `1` |
| `DISABLE_HMR` | Não necessária | Somente ambiente de desenvolvimento que exigir | Não necessária |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Não necessária | Opcional: Chromium local | Opcional; CI instala browser fixado |
| `SUPABASE_DATABASE_URL` | Não necessárias | URL opcional do diagnóstico legado de leitura | Não necessárias |

Gerar o segredo em um gerenciador de segredos ou com `openssl rand -hex 32`, capturando diretamente no arquivo protegido. Não reutilizar chaves Supabase API como segredo JWT. Não são necessários Supabase Auth, Storage, Gemini, `MY_APP_URL` ou `GH_TOKEN` no runtime. `APP_URL` não é `MY_APP_URL`.

**Leitura local, sem conexão com o banco:** `npm run check:production` valida as variáveis e o modo TLS. APIs de produção também recusam configuração inválida com 503; liveness/readiness continuam disponíveis. Execute com as variáveis carregadas pelo mecanismo seguro do operador; não colar URLs no terminal. Não imprimir `env`, `printenv` ou arquivos de segredos.

Sessões duram sete dias e exigem assinatura HS256, emissor, público, expiração, sujeito e perfil válidos. O backend reconsulta o usuário/perfil no banco; usuário removido ou perfil alterado invalida a sessão. Em produção o cookie é HttpOnly/Secure/SameSite=Lax. O endurecimento das claims exige novo login para sessões anteriores. Operações POST/PUT/DELETE/PATCH exigem `Origin` igual a `APP_URL`; chamadas automatizadas autenticadas devem enviar essa origem. Não adicionar exceções cross-site para contornar o controle.

Atalhos e credenciais demonstrativas da tela de login são exclusivos de desenvolvimento e não aparecem em produção. Novos alunos/professores recebem senha inicial individual de mínimo 12 caracteres e máximo 72 bytes UTF-8 informada pela direção; em produção não existe fallback para a senha de desenvolvimento. **Antes do deploy, homologar os usuários existentes e substituir senhas conhecidas de demonstração por procedimento administrativo controlado, fora desta etapa.** Não existe neste marco um fluxo novo de recuperação ou troca de senha. O preflight não comprova força/segredo de senhas existentes.

## 3. PostgreSQL e poolers

O runtime normaliza URLs Supabase para `sslmode=require&sslaccept=strict`. Transaction Pooler (porta indicada pelo painel, normalmente 6543) recebe `pgbouncer=true`. Session Pooler e conexão direta não recebem esse modo. Copiar hosts, usuários e portas do painel do projeto; não deduzi-los de outro projeto.

`DIRECT_URL` usa conexão direta ou Session Pooler; conexão direta pode exigir IPv6. Ajustar `connection_limit`, `pool_timeout` e `connect_timeout` conforme limite de conexões do projeto e quantidade de processos. O exemplo usa um único processo e limites conservadores. Para PostgreSQL remoto fora do Supabase, configurar explicitamente TLS estrito. Não usar `sslaccept=accept_invalid_certs`, `sslmode=disable` ou sobrescrita de host. Se houver CA privada legítima, fornecer o certificado confiável pelo mecanismo do Prisma, sem desativar validação.

O schema atual possui cinco migrations. Nenhuma migration nova foi criada no Marco 10. Não executar `prisma db push`, `migrate reset`, seed ou `migrate deploy` contra o banco compartilhado nesta etapa.

## 4. Preflight somente leitura

**Comandos seguros de leitura/validação:**

```sh
npm run check:production
npx prisma validate
npx prisma generate
npm run preflight
```

`generate` escreve somente arquivos locais. `preflight` usa Prisma com transações `READ ONLY`, consulta `SELECT 1` e compara tabelas, colunas, tipos/enums, índices, chaves estrangeiras e checksums/histórico de migrations com os arquivos versionados. Inspeciona `DATABASE_URL` e `DIRECT_URL` separadamente. Não conecta silenciosamente por uma URL alternativa. Retorna código diferente de zero se faltam configuração, conexão, histórico verificável ou compatibilidade de schema. O resultado `safeToProceed` é um **gate técnico**, não uma autorização para deploy ou prova de integridade de todos os dados.

Se estiver bloqueado por rede, executar da futura VPS ou máquina autorizada, preservando o JSON sem credenciais como evidência. No Codex Cloud desta sessão não há concessão TCP PostgreSQL/VPN para o banco remoto; conectividade validada externamente não substitui esse preflight no destino.

Migrations pendentes: interromper; gerar backup; restaurar uma cópia isolada; revisar SQL e impacto em dados; aplicar e testar na cópia; obter autorização específica do responsável; só então programar a aplicação no destino. **`prisma migrate deploy` modifica banco e não faz parte da inspeção.** Nunca executar automaticamente durante startup, health check ou CI contra Supabase. Divergências de histórico não devem ser apagadas ou marcadas como resolvidas sem investigação.

## 5. Backup e recuperação

Antes de qualquer implantação com mudança de banco, confirmar retenção e opções de backup/PITR disponíveis no plano Supabase. Registrar quem restaura, destino, janela, RPO/RTO, localização e acesso ao backup. Um backup não está homologado até passar por uma restauração em banco isolado.

Para clientes PostgreSQL usar um serviço `fuctura` em `pg_service.conf` e senha em `.pgpass`, ambos protegidos. Configurar host/usuário/banco reais e TLS `verify-full` com CA confiável conforme o provedor. Não passar URL com senha na linha de comando. Usar conexão direta ou Session Pooler e versão do cliente compatível com o servidor.

**Leitura do remoto e escrita de arquivo de backup (execução futura pelo operador):**

```sh
PGSERVICE=fuctura pg_dump --format=custom --no-owner --no-acl --file=REPLACE_BACKUP_PATH
pg_restore --list REPLACE_BACKUP_PATH
sha256sum REPLACE_BACKUP_PATH
```

Criptografar o backup e restringir acesso; ele pode conter dados pessoais e hashes. Não subir ao Git ou artefatos públicos. O dump do schema da aplicação não substitui backup de roles/configurações da infraestrutura Supabase.

**Escrita em banco de restauração isolado, nunca no remoto compartilhado:** configurar serviço distinto `fuctura_restore` e verificar seu destino antes de `PGSERVICE=fuctura_restore pg_restore --single-transaction --no-owner --no-acl --dbname='service=fuctura_restore' REPLACE_BACKUP_PATH`. Este comando altera o banco escolhido. Validar preflight, contagens, autenticação e invariantes financeiros/acadêmicos na cópia. Restaurar produção exige plano específico e autorização; não executar esse procedimento nesta etapa.

## 6. Build e preparação da release

Construir em sistema compatível com a VPS (Node/arquitetura/OpenSSL compatíveis com Prisma). Registrar commit e versão das ferramentas. Não usar diretório em execução para compilar ou instalar dependências.

**Escrita local, sem alteração de banco:**

```sh
bun install --frozen-lockfile
npx prisma generate
npm run build
npm run prepare:standalone
```

O último comando copia `public` e `.next/static` para `.next/standalone`; esses arquivos são necessários para PWA/assets. `.next/standalone/server.js` contém o servidor e dependências rastreadas. Não copiar `.env` junto aos artefatos. Criar `.next/standalone/.next/cache` e permitir escrita somente ali quando usar o modelo systemd. O build não deve depender de uma consulta de dados remotos.

Executar `npm run test:all` antes da liberação, com `TEST_DATABASE_URL` apontando exclusivamente ao banco isolado. O runner gera segredo próprio e sobrescreve ambas as URLs antes de qualquer migration/fixture. O modo `all` inclui testes do servidor realmente compilado em produção, com e sem banco, e regressão dos Marcos 7–9 em desktop/mobile. A migration no runner é permitida apenas no banco de testes.

## 7. Inicialização e reinício

Estrutura sugerida: `REPLACE_RELEASE_ROOT/releases/COMMIT` e link `current`, com arquivo de ambiente protegido externo. O modelo `deploy/fuctura.service.example` usa usuário dedicado, diretório da release, Node com caminho absoluto, bind loopback, restart automático e journal. Substituir todos os `REPLACE_*`; validar a unidade com `systemd-analyze verify` na VPS antes de instalar. Não executar como root.

**Comandos futuros que alteram infraestrutura**, dependentes de autorização e valores concretos: instalar unidade, `systemctl daemon-reload`, `systemctl enable/start/restart fuctura`. Nada disso é executado pelo repositório ou workflow. Não iniciar tráfego externo se readiness estiver 503.

## 8. Proxy reverso

`deploy/nginx.conf.example` contém proxy para loopback, headers encaminhados controlados, limite por IP de login, tamanho de corpo compatível com ausência de uploads e logs sem query/cookies/Authorization. Confirmar portas, domínio e caminhos de certificado/log antes de ativar. Não expor diretamente a porta Node no firewall. `nginx -t` valida sintaxe na VPS; reload altera infraestrutura e só ocorre após revisão/autorização.

O limite de login da aplicação guarda até 10.000 identificadores hash, com 10 tentativas por conta em 10 minutos; reinício limpa a memória. É adequado para o **único processo** desta estratégia junto ao limite Nginx. Escala com múltiplos processos/servidores exige limitador compartilhado e análise posterior; não declarar proteção distribuída implementada. O proxy não deve incluir bodies/cookies em logs de depuração.

## 9. HTTPS

Criar registros DNS e obter certificado válido pelo procedimento da distribuição/provedor escolhido. Confirmar renovação automática, validade e cadeia confiável. Não usar certificado autossinado para acesso de usuários, não desativar validação TLS. Configurar `APP_URL` exatamente com a origem externa. Confirmar redirecionamento HTTP→HTTPS; habilitar HSTS somente após HTTPS funcionar. Escolher política de firewall e portas conforme infraestrutura concreta.

## 10. Health checks

| Endpoint | Acesso | Significado |
| --- | --- | --- |
| `/api/health/live` | Público, 200 | Processo respondendo; não consulta banco |
| `/api/health/ready` | Público, 200/503 | Configuração válida, leitura leve do banco e última migration finalizada; não revela detalhes |
| `/api/health/details` | Somente DIRETOR | Booleans separados de aplicação/configuração/banco/migration/prontidão; nenhum host/URL/erro interno |

As consultas são somente leitura com timeout; não inicializam dados. Readiness é uma verificação leve, **não** a comparação completa de schema/histórico feita pelo preflight. Liveness continua disponível quando o banco falha. Autenticação indisponível por falha de banco nega acesso; detalhes protegidos podem retornar 401 nesse caso, enquanto ready retorna 503. Configurar o proxy/operador para verificar **ready** antes de receber tráfego; não reiniciar incessantemente o serviço por indisponibilidade do provedor de banco.

## 11. Verificação pós-implantação e logs

Futura homologação controlada: health 200, HTTPS/cookie seguro, login de cada perfil, autorização entre perfis/turmas, turmas/alunos/cronogramas/diários reais, links de materiais, presença/recompensa única e leilão/ledgers. Escritas de homologação devem ser previamente autorizadas e planejadas; a Etapa 1 não as executa no Supabase. Confirmar assets, instalação PWA e navegação mobile. O service worker guarda apenas ícones públicos; páginas, APIs e sessões precisam de rede, evitando reapresentar dados de outro usuário/offline.

Os logs da aplicação registram evento e código de erro permitido; não serializam stack, mensagem Prisma, objetos de erro, senhas, tokens, cookies ou dados pessoais. Eventos distinguem autenticação/XP, presença, Coins, leilão e saúde. O middleware emite `X-Request-Id` novo por chamada; logs Nginx permitem correlação por esse ID, método/caminho/status/tempo. Os eventos internos ainda não carregam esse ID em todos os serviços; não afirmar rastreamento distribuído.

Modelo `deploy/journald.conf.example`: persistência com limite de espaço/retenção. Ver logs com `journalctl -u fuctura` (leitura operacional); restringir acesso, conferir rotação do Nginx e não ativar dumps de requisições. Não exportar logs com dados reais sem revisão.

## 12. Atualização

Em nova release isolada: checkout do commit aprovado, instalação congelada, suíte isolada, build/standalone, preflight somente leitura no destino, backup/restauração conforme mudança e autorização. Só então alterar atomicamente o link `current`, reiniciar serviço e verificar readiness/homologação. Manter release anterior e manifesto do commit. Não executar migration no startup ou ativar deploy a cada push.

## 13. Rollback

Se nova aplicação falhar e schema permanecer compatível: parar/reverter tráfego, apontar `current` para release anterior previamente homologada, reiniciar e verificar readiness/fluxos. Não fazer rollback para versão com falhas de segurança sem mitigação aprovada. O Marco 10 não altera schema, portanto rollback de aplicação não requer alteração de banco. Sessões antigas podem exigir novo login.

Rollback de banco é operação distinta e potencialmente causa perda de dados: não rodar migrations inversas/reset nem restaurar dump automaticamente. Se houve mudança incompatível, preferir correção progressiva; restauração requer backup comprovado, janela e autorização específica do responsável.

## 14. Diagnóstico e checklist de liberação

| Sintoma | Verificação segura |
| --- | --- |
| Processo inicia mas ready 503 | Configuração, rede/DNS/porta, TLS, credenciais e migration via preflight; não confundir liveness com conexão |
| URL direta sem acesso IPv6 | Usar Session Pooler indicado pelo próprio painel para `DIRECT_URL`; não trocar senha por suposição |
| CSRF 403 | `APP_URL` versus origem HTTPS real e headers; não relaxar a política |
| Login 429 | Janela de tentativas/aplicação e Nginx; não remover o limitador |
| Cookie não mantém sessão | HTTPS, flags, segredo estável, perfil real, expiração/novo login após atualização |
| Erro genérico de banco | Código seguro/evento no journal + preflight protegido; não habilitar logs de credenciais |
| Assets/PWA ausentes | `prepare:standalone`, arquivos copiados e rede; páginas privadas não têm cache offline |
| Migration/schema incompatível | Interromper, revisar SQL/histórico na cópia; nunca usar db push/reset como correção |

Checklist de implantação futura:

- [ ] VPS/distribuição/usuário/diretórios/portas definidos e revisados.
- [ ] Domínio/DNS/HTTPS/renovação/firewall prontos; Node restrito a loopback.
- [ ] Segredo próprio, URLs corretas, TLS validado e ambiente protegido sem placeholders.
- [ ] Usuários reais e senhas iniciais homologados; nenhum acesso demonstrativo mantido.
- [ ] Preflight aprovado pelos dois caminhos no banco de destino; divergências resolvidas com autorização.
- [ ] Backup e restauração isolada comprovados; RPO/RTO e responsável registrados.
- [ ] Suíte completa e CI aprovadas no commit escolhido; standalone completo.
- [ ] Templates Nginx/systemd/journal preenchidos e validados na VPS.
- [ ] Release anterior/rollback e logs/retenção disponíveis.
- [ ] Autorização explícita para deploy e eventuais mudanças de banco obtida.
- [ ] Ready 200, HTTPS, perfis, fluxos críticos e mobile homologados após implantação.

Até cumprir as pendências externas, o sistema está preparado no repositório, mas **não liberado para produção**.

## 15. Comandos VPS para homologação (execução futura autorizada)

Plano específico/roteiro em [HOMOLOGATION.md](HOMOLOGATION.md); mantém os procedimentos anteriores. **Não executados nesta etapa.** Preencher variáveis/path e renderizar modelos antes de comandos que alteram infraestrutura. Confirmar distribuição primeiro (`cat /etc/os-release`); não aplicar comandos de uma família Linux em outra.

Dependências: se o operador confirmar Debian/Ubuntu com apt e repositório PostgreSQL compatível previamente revisado, exemplos de instalação são `sudo apt-get update` e `sudo apt-get install nginx apache2-utils ca-certificates curl xz-utils postgresql-client-REPLACE_PG_MAJOR`. Para outra distribuição usar seu gerenciador aprovado. Cliente pg_dump deve ser compatível com o servidor. Node 24.x e Bun 1.4.2 devem vir de fonte oficial com integridade verificada, sem desativar TLS/checksums. Não presumir que o pacote `nodejs` do sistema oferece versão 24; confirmar `node --version`, `bun --version`, `pg_dump --version`.

Exemplo de instalação Node oficial, **somente depois de preencher versão/arquitetura e confirmar Linux**:

```sh
NODE_VERSION=vREPLACE_24_PATCH
NODE_ARCH=REPLACE_x64_OR_arm64
case "$NODE_VERSION" in v24.*) ;; *) exit 1 ;; esac
case "$NODE_ARCH" in x64|arm64) ;; *) exit 1 ;; esac
mkdir -p /tmp/fuctura-node-install
cd /tmp/fuctura-node-install
curl --fail --location --proto '=https' --tlsv1.2 --remote-name "https://nodejs.org/dist/$NODE_VERSION/node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz"
curl --fail --location --proto '=https' --tlsv1.2 --remote-name "https://nodejs.org/dist/$NODE_VERSION/SHASUMS256.txt"
grep " node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz$" SHASUMS256.txt > selected.sha256
sha256sum --check selected.sha256
sudo mkdir -p /opt/fuctura-node
sudo tar -xJf "node-$NODE_VERSION-linux-$NODE_ARCH.tar.xz" --strip-components=1 -C /opt/fuctura-node
/opt/fuctura-node/bin/node --version
```

Não executar se checksum falhar ou versão/path forem placeholders. Com Node 24/npm no PATH e um diretório de tooling escolhido, instalar a versão fixada pelo registry confiável (npm verifica integridade): `npm install --prefix REPLACE_TOOLING_PREFIX --no-audit --no-fund bun@1.4.2`; adicionar `REPLACE_TOOLING_PREFIX/node_modules/.bin` ao PATH dos comandos de build/preflight e conferir `bun --version`. Não desabilitar TLS/integridade. O serviço usa Node absoluto fora de home, pois o modelo systemd protege `/home`.

Preparação de release (caminhos/usuário escolhidos pelo operador; não contém credenciais inline):

```sh
FUCTURA_RELEASE_ROOT=/REPLACE_RELEASE_ROOT
FUCTURA_RELEASE_DIR=/REPLACE_RELEASE_ROOT/releases/REPLACE_APPROVED_COMMIT
FUCTURA_ENV_FILE=/REPLACE_PRIVATE_ENV_FILE
FUCTURA_APP_USER=REPLACE_APP_USER
FUCTURA_APP_GROUP=REPLACE_APP_GROUP
# Carregar somente arquivo confiável 0600 com sintaxe shell válida, nunca arquivo de origem desconhecida.
set -a
. "$FUCTURA_ENV_FILE"
set +a
cd "$FUCTURA_RELEASE_DIR"
bun install --frozen-lockfile
npm run check:production
npm run preflight
npx prisma generate
npm run build
npm run prepare:standalone
mkdir -p .next/standalone/.next/cache
sudo chown -R "$FUCTURA_APP_USER:$FUCTURA_APP_GROUP" "$FUCTURA_RELEASE_DIR"
```

Executar testes antes, no banco local descartável, conforme seção 6. Nenhuma migration está incluída na preparação da release. O checkout/release deve apontar exatamente para commit aprovado; não compilar no diretório que já atende tráfego. O segredo/arquivo externo não deve ser copiado para `.next/standalone`.

Renderizar os modelos em diretório de revisão: `cp deploy/fuctura.service.example REPLACE_RENDERED_SERVICE`, `cp deploy/nginx.conf.example REPLACE_RENDERED_NGINX`, `cp deploy/staging-access.conf.example REPLACE_RENDERED_ACCESS`. Editar TODOS os placeholders e incluir o arquivo de acesso adicional dentro do server HTTPS. O redirecionamento usa `APP_URL` completo, inclusive porta externa não padrão. Se houver Nginx de produção no mesmo host, usar nomes globais/zonas distintos.

Criar a barreira sem senha na linha de comando (utiliza prompt):

```sh
sudo htpasswd -c REPLACE_STAGING_HTPASSWD_FILE REPLACE_GATE_USERNAME
sudo chmod 0640 REPLACE_STAGING_HTPASSWD_FILE
# Definir proprietário/grupo para permitir leitura apenas ao Nginx e ao operador.
```

Comandos que **alteram infraestrutura** após autorização e revisão do material renderizado:

```sh
sudo systemd-analyze verify REPLACE_RENDERED_SERVICE
sudo install -m 0644 REPLACE_RENDERED_SERVICE /etc/systemd/system/fuctura-staging.service
sudo install -m 0644 REPLACE_RENDERED_ACCESS REPLACE_NGINX_ACCESS_INCLUDE_PATH
sudo install -m 0644 REPLACE_RENDERED_NGINX REPLACE_NGINX_SERVER_INCLUDE_PATH
sudo nginx -t
# Criar DNS/certificado por procedimento específico aprovado antes de ativar o proxy HTTPS.
ln -s "$FUCTURA_RELEASE_DIR" "$FUCTURA_RELEASE_ROOT/current.next"
mv -Tf "$FUCTURA_RELEASE_ROOT/current.next" "$FUCTURA_RELEASE_ROOT/current"
sudo systemctl daemon-reload
sudo systemctl enable --now fuctura-staging
sudo systemctl reload nginx
sudo systemctl status fuctura-staging --no-pager
sudo journalctl -u fuctura-staging --since '10 minutes ago'
```

Modelos de logs/retenção na seção 11; confirmar journal persistente e rotação Nginx antes de liberar acesso. `systemctl`, `install`, links e reload acima não são verificações somente leitura. Certificado, DNS, firewall e renovação dependem do provedor/OS escolhido e não têm valores presumidos; validar por HTTPS sem `curl -k`/TLS desabilitado. Não expor porta Node externamente. Basic Auth não substitui as sessões/perfis da aplicação.

Atualização: preparar nova release pelo mesmo procedimento; apontar link e `sudo systemctl restart fuctura-staging`; só liberar após readiness, preflight e roteiro. Rollback de aplicação com schema compatível:

```sh
ln -s REPLACE_PREVIOUS_APPROVED_RELEASE "$FUCTURA_RELEASE_ROOT/current.next"
mv -Tf "$FUCTURA_RELEASE_ROOT/current.next" "$FUCTURA_RELEASE_ROOT/current"
sudo systemctl restart fuctura-staging
```

Depois validar `staging:published` e fluxos, manter barreira/noindex e registrar resultado. Não restaurar banco/migrations automaticamente; usar plano específico de backup/recuperação autorizado. Esta tarefa não executa os comandos VPS acima.
