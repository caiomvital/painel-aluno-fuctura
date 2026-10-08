# Cadastro público de alunos

Link: `/cadastro`, também disponível na tela de login. Campos: nome, curso (Java, Python ou IA), e-mail e senha. A senha tem 6–8 caracteres e pelo menos um número, sem exigência de letras, maiúsculas ou símbolos; `senha123` é válida. A regra aplica-se ao cadastro público; contas já existentes e cadastro administrativo preservam seu comportamento.

O cadastro persiste um User ALUNO e uma solicitação PENDING, com senha bcrypt, sem Student, matrícula, XP, Coins ou sessão. E-mail normalizado e único; duplicidade não sobrescreve dados/senha. O login só revela o aviso de pendência após verificar a senha: **Confirmação pendente, entre em contato com a Secretaria**. Credencial incorreta permanece genérica. Sessões também revalidam aprovação no banco.

Diretor → Alunos → Solicitações de cadastro: consulta nome, e-mail, curso e data; filtra Pendente/Aprovado/Rejeitado; aprova/rejeita. Backend exclusivo DIRETOR, valida relações/decisão. Aprovação transacional com lock cria um único aluno com XP/Coins zero e mantém o hash original. Registra responsável/data; repetição da mesma decisão é idempotente. Decisão oposta após resolução é recusada. Rejeição mantém acesso bloqueado com a mesma mensagem solicitada. Matrícula em turma continua pelo fluxo administrativo existente; curso escolhido é interesse acadêmico, sem criação automática de turma ou matrícula.

POST `/api/auth/register`; GET/POST `/api/director/registrations`; login/sessão existentes modificados para consultar aprovação. Rate limiting do cadastro por IP recebido do proxy confiável (ou bucket comum sem IP); limite de login existente preservado; CSRF e logging seguro existentes reutilizados. A senha nunca é retornada ou logada. Não há recuperação/troca de senha, validação de e-mail, notificações ou cadastro público de professores.

## Atualização da homologação — somente após revisão/autorização

Migration aditiva `20261008_student_registration_approval`: enum de cursos, enum de estados e tabela RegistrationRequest com FKs/índices. Não altera contas existentes, saldos ou ledgers. É necessária para persistir e auditar aprovações; readiness da versão nova exige seu histórico aplicado. Não foi aplicada ao Supabase nesta implementação.

1. Confirmar alvo homologação e backup; usar guia DEPLOYMENT.md §5 e provar restauração em cópia isolada. Não publicar dumps/credenciais. Guardar commit anterior e backup do código/standalone antes de reconstruir no diretório ativo.
2. Conservar `/etc/fuctura-hml.env` e `/etc/fuctura-hml/supabase-ca.crt` fora do Git. APP_ENV=staging, APP_URL HTTPS, sslcert da CA e sslaccept=strict permanecem. Não executar test:all com essas variáveis/banco remoto.
3. Baixar o commit aprovado numa release separada, instalar com frozen lockfile, Prisma validate/generate, TypeScript, ESLint, build e prepare:standalone. Preparar dependências isoladas. Não apontar Nginx para código ainda sem migration. Build não autoriza alterar banco.
4. Conferir fingerprint conhecido do projeto; executar `prisma migrate status` e revisar o SQL. Backup/restauração e autorização explícita antes de `prisma migrate deploy` somente neste banco de homologação. Não executar db push/reset/seed.
5. `preflight` deve aprovar schema/histórico/checksums. Parar o serviço para mudar release/WorkingDirectory/ReadWritePaths do systemd de forma controlada; conservar usuário restrito, Node absoluto, porta 3100 loopback e CA acessível. Reiniciar, exigir readiness local e HTTPS antes de liberar testes.
6. Testar envio com e-mail fictício, login pendente, aprovação pelo diretor e login aprovado. Conferir rejeição e ausência de XP/Coins antes do primeiro login aprovado. Matrícula manual, se necessária ao roteiro.
7. Rollback: voltar release/configuração do serviço anterior com schema aditivo preservado. Não remover a tabela nem restaurar/resetar dados automaticamente; backup de banco é plano separado e autorizado.

Detalhes de publicação, backups e rollback permanecem em DEPLOYMENT.md e HOMOLOGATION.md. Sem deploy automático nem escrita remota pela CI. A VPS em uso tem serviço fuctura-hml; atualizações devem ser guiadas em blocos curtos pelo terminal do operador, após as verificações anteriores.
