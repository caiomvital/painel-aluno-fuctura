# Suíte de serviços do Marco 7

A suíte existente permanece em `test-marco7.ts` e executa 17 verificações reais
no PostgreSQL. Usa fixtures próprias, não omite cenários e remove os dados criados
pela execução, inclusive após falha. Recusa bancos remotos ou sem sufixo `_test`.

Execute pela raiz do checkout:

```sh
export TEST_DATABASE_URL=postgresql://onboarding@127.0.0.1:5432/fuctura_marco7_test
npm run test:integration
```

O runner valida a conexão antes de aplicar migrations e substitui `DATABASE_URL`
e `DIRECT_URL` somente nos subprocessos. Não use o Supabase como banco de testes.

Veja [TESTING.md](../TESTING.md) para iniciar PostgreSQL descartável, executar
Playwright, acessar artefatos, rodar toda a suíte e consultar o Supabase sem escrita.
