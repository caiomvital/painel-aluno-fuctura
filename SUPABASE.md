# PostgreSQL/Supabase — configuração e diagnóstico de leitura

A aplicação utiliza Prisma/PostgreSQL e autenticação própria. Não depende de Supabase Auth ou Storage. As credenciais devem ficar em variáveis seguras ou arquivos `.env` ignorados, nunca no Git ou nos relatórios.

## Variáveis necessárias

| Variável | Uso |
| --- | --- |
| `DATABASE_URL` | Conexão da aplicação Next.js |
| `DIRECT_URL` | Conexão de ferramentas Prisma, declarada em `schema.prisma` |
| `AUTH_SECRET` | Segredo aleatório próprio para assinar sessões; não é chave da API Supabase |
| `TEST_DATABASE_URL` | Somente testes: PostgreSQL isolado em loopback, nome terminado em `_test` |
| `SUPABASE_DATABASE_URL` | Opcional: conexão específica para o diagnóstico, preservando `DATABASE_URL` local |

Copie as URIs exatas do botão **Connect** do seu projeto Supabase. Preserve host, região, usuário e banco exibidos pelo painel. Escape os caracteres da senha para uso em URL. Não adivinhe região, usuário ou senha.

- **Transaction Pooler, 6543:** apropriado para a aplicação em ambientes serverless. `DATABASE_URL` deve incluir `pgbouncer=true&sslmode=require&sslaccept=strict`.
- **Session Pooler, 5432:** alternativa com IPv4 para aplicação e ferramentas Prisma; não ativa automaticamente `pgbouncer=true`.
- **Direta, 5432:** use em `DIRECT_URL` quando a máquina conseguir alcançar o endereço fornecido. A disponibilidade de IPv4/IPv6 deve ser comprovada por DNS e transporte, não presumida.
- **`DIRECT_URL` não deve usar Transaction Pooler:** quando a conexão direta não for alcançável, copie o **Session Pooler** em 5432 do próprio painel.

O cliente da aplicação normaliza URLs Supabase para `sslmode=require&sslaccept=strict`. A CLI Prisma lê as variáveis diretamente; mantenha esses parâmetros também nas URIs configuradas em seu ambiente, especialmente `DIRECT_URL`. PostgreSQL local é preservado sem imposição de TLS. Há exemplos sem credenciais em `.env.example`.

Se o certificado do servidor não puder ser validado, obtenha o certificado/CA disponibilizado nas configurações de SSL do projeto e configure `sslcert` com o caminho do arquivo de CA confiável. Confirme hostname e cadeia. Nunca use `sslaccept=accept_invalid_certs`, `sslmode=disable` ou `rejectUnauthorized=false` para contornar erro.

## Diagnóstico

Instale as dependências pelo lockfile e execute na raiz:

```sh
npm run test:supabase
```

O script usa variáveis do processo/ambiente Bun, verifica `DATABASE_URL` (ou a substituição opcional) e `DIRECT_URL`, e salva `test-results/supabase.json`. Não registra senha, usuário, token, URL completa ou dados de alunos. Retorna código **1** quando a validação não está completa; somente retorna **0** quando todos os passos de ambos os destinos são aprovados.

Etapas: variável → URL → DNS → TCP → negociação SSL PostgreSQL e certificado/hostname → autenticação Prisma → `SELECT 1` → schema → histórico/checksums das migrations. Resultados: `APROVADA`, `FALHOU`, `NÃO EXECUTADA`. Uma etapa bloqueada deixa as dependentes não executadas; ausência de erro não equivale a conexão comprovada.

A inspeção executa somente leituras em uma transação PostgreSQL **READ ONLY**. Compara as 22 tabelas e os campos Prisma, tipos/nulabilidade, valores de enum, chaves primárias, 56 índices e 25 chaves estrangeiras definidos pelas migrations; inclui o índice único parcial de reserva ativa e os índices únicos dos ledgers. Lê `_prisma_migrations` sem logs de erros potencialmente sensíveis e compara nomes, conclusão e checksums com os cinco arquivos versionados. Não aplica alterações ou migrations. Ausência do histórico é registrada como não comprovada, não como evidência de que todas as tabelas estão ausentes.

## Limite do Codex Cloud

No ambiente diagnosticado, os hosts remotos falharam no DNS com `EAI_AGAIN`, o listener `proxy:8088` recusou conexão (`ECONNREFUSED`), `vpn_configured` era falso e as permissões TCP estavam vazias. A lista de domínios HTTP não cria conectividade PostgreSQL, e Prisma não usa `HTTP_PROXY` para seu protocolo de banco.

O transporte TCP documentado desse ambiente exige VPN e um destino IPv4 **privado** autorizado. Adicionar o hostname público do Supabase à lista HTTP ou apenas publicar novamente o ambiente não comprova nem libera uma rota PostgreSQL pública. Não instale VPNs paralelas nem altere rotas para contornar a política.

Para desbloquear a verificação:

1. Execute o mesmo diagnóstico em sua máquina ou no ambiente de execução da aplicação, com saída PostgreSQL real permitida, usando as variáveis seguras existentes. Não compartilhe os valores no chat.
2. Copie **Connect → Session Pooler** para `DIRECT_URL` se a conexão direta depender de uma família IP que a máquina não alcança. Preserve TLS estrito.
3. Se também falhar ali, use os códigos/etapas do relatório para verificar **Network Restrictions** do projeto. Caso haja restrições, autorize somente o IP/CIDR de saída confirmado dessa máquina; não abra acesso geral e não invente o IP.
4. Para exigir a execução dentro deste Codex Cloud, solicite ao administrador do ambiente um transporte PostgreSQL suportado. Informe: destinos indicados no relatório, portas 6543/5432, DNS `EAI_AGAIN`, listener TCP `ECONNREFUSED`, ausência de VPN/permissões TCP. A política documentada atual não oferece acesso TCP direto aos endpoints públicos; um eventual transporte privado exige configuração/revisão pelo administrador e uma nova verificação real.

Não há evidência de senha inválida, indisponibilidade do Supabase ou bloqueio nas configurações do projeto enquanto transporte e autenticação não forem alcançados.

## Migrations: plano posterior, sem execução automática

A compatibilidade remota e migrations pendentes só podem ser determinadas após leitura real. Existem cinco migrations locais; isso não comprova seu estado remoto.

Se o diagnóstico apontar pendências ou divergências:

1. Conferir backup/snapshot recente e testar restauração em banco separado.
2. Exportar o relatório de schema e histórico; comparar SQL/checksums sem modificar migrations já aplicadas.
3. Avaliar duplicidades com consultas de leitura antes de índices únicos de presença, XP/Coins e reserva ativa.
4. Revisar especificamente `20261006_point_transaction_unique_origin_ref`: ela contém `UPDATE` de `originReference` de transações legadas. Exige avaliação dos dados e aprovação explícita; não é uma migration puramente estrutural.
5. Reproduzir e validar o plano sobre uma cópia isolada do banco, incluindo reconciliação dos ledgers, locks e janela operacional.
6. Apresentar o SQL/plano e obter autorização explícita antes de executar qualquer alteração no destino. Somente depois disso considerar `prisma migrate deploy` com conexão direta/session, conforme o plano aprovado.
7. Reexecutar o diagnóstico de leitura e os testes na cópia. Não usar `db push`, `migrate reset` ou seeds no Supabase compartilhado.

Nesta etapa nenhum desses passos de escrita é executado. A aplicação não deve ser declarada pronta para esse destino até conexão, consulta, schema e histórico serem comprovados.
