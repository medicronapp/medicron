# O que só você pode fazer (em ordem)

Tudo o que dá para fazer e testar sozinho já está no repositório (`main`). Os itens abaixo dependem de contas, do banco de produção ou de aparelho real. Atualizado a cada plano.

## A. Banco e publicação (obrigatório antes de publicar o Plano 4)

1. **Aplicar a migração `0008` (tabela `push_devices`).** Aditiva (só `CREATE TABLE`).
   ```bash
   cd apps/api && node --env-file=.env.local ../../node_modules/drizzle-kit/bin.cjs migrate
   ```
2. **Publicar a API** (só depois do item 1): `vercel --prod --yes`. Hoje a produção roda o código do Plano 3D; `main` já tem o Plano 4.

## B. Push nativo (detalhes e checklist em `docs/push-setup.md`)

3. `npx eas-cli login` e `npx eas-cli init` em `apps/app`; commitar o `extra.eas.projectId` no `app.json`.
4. Chave APNs (Apple) e conta de serviço FCM (Firebase) no EAS; `google-services.json` em `apps/app/` e `android.googleServicesFile` no `app.json`.
5. Build de teste em aparelho real e o checklist de teste de push.

## C. Segurança antes das lojas

6. **Remover `EXTRA_TRUSTED_ORIGINS=exp://**` da produção** (era só para o Expo Go em desenvolvimento): `vercel env rm EXTRA_TRUSTED_ORIGINS production` e publicar de novo. Os builds de loja usam `medicron://`.

## D. Teste de ponta a ponta (você, no simulador/aparelho)

7. Login, trocar de conta, sair; Hoje (registrar dose, tour, dia passado); Pacientes e Rotinas; Itens; Conta (convite com **segunda conta**, copiar link, aparência nos três modos, notificações); fluxo do convidado (link sem sessão → criar conta → aceitar); voltar/gestos sem tela duplicada.
