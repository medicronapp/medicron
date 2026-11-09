# O que só você pode fazer (em ordem)

Tudo o que dá para fazer e testar sozinho já está no repositório (`main`). Os itens abaixo dependem de contas, do banco de produção ou de aparelho real. Atualizado a cada plano.

## A. Banco e publicação — feito em 2026-11-08

1. Migração `0008` (`push_devices`) aplicada em produção e conferida (5 colunas, 0 linhas).
2. API publicada com os Planos 4 e 5 (`/privacidade` 200; `/.well-known/*` 404 até as variáveis da seção E existirem).

## B. Push nativo (detalhes e checklist em `docs/push-setup.md`)

3. `npx eas-cli login` e `npx eas-cli init` em `apps/app`; commitar o `extra.eas.projectId` no `app.json`.
4. Chave APNs (Apple) e conta de serviço FCM (Firebase) no EAS; `google-services.json` em `apps/app/` e `android.googleServicesFile` no `app.json`.
5. Build de teste em aparelho real e o checklist de teste de push.

## C. Segurança antes das lojas

6. **Remover `EXTRA_TRUSTED_ORIGINS=exp://**` da produção** (era só para o Expo Go em desenvolvimento): `vercel env rm EXTRA_TRUSTED_ORIGINS production` e publicar de novo. Os builds de loja usam `medicron://`.

## D. Teste de ponta a ponta (você, no simulador/aparelho)

7. Login, trocar de conta, sair; Hoje (registrar dose, tour, dia passado); Pacientes e Rotinas; Itens; Conta (convite com **segunda conta**, copiar link, aparência nos três modos, notificações); fluxo do convidado (link sem sessão → criar conta → aceitar); voltar/gestos sem tela duplicada.
8. **iPhone (Plano 8):** remova o atalho antigo da tela de início e adicione de novo pelo Safari (o iOS guarda a barra de status na hora da instalação). Com o iPhone em modo escuro e o tema Padrão, a barra de status deve ficar escura. Em Conta → Aparência, teste Claro, Escuro e Padrão e feche e reabra o app: a escolha deve continuar. **Limite do iOS:** a barra de status segue o tema que valia quando você instalou o atalho; se trocar o tema do iPhone ou do app depois, remova e adicione o atalho de novo. Se o relógio ficar ilegível (texto branco em fundo claro), me avise: o plano B está na spec.

## E. Lojas (Plano 5; textos e questionários prontos em `docs/lojas.md`)

8. **Variáveis na Vercel** (projeto da API; você roda com `!`): `vercel env add CONTACT_EMAIL production` (e-mail de suporte). `APPLE_TEAM_ID` (Apple Developer → Membership) e `ANDROID_SHA256_CERT_FINGERPRINTS` (Play Console → Integridade do app → Assinatura do app, impressão SHA-256; várias separadas por vírgula) só existem depois dos itens 11 e 12. Publique a API de novo depois de definir.
9. **Conferir em produção** (depois de publicar): `curl -i https://medicron.com.br/privacidade`, `curl -i https://medicron.com.br/.well-known/apple-app-site-association` e `.../assetlinks.json` (200 e `application/json`, sem redirecionar).
10. **Contas de desenvolvedor:** Apple Developer Program (US$ 99/ano) e Google Play Console (US$ 25, única vez).
11. **Build iOS:** `cd apps/app && npx eas-cli build --platform ios --profile production`; depois `npx eas-cli submit --platform ios` (vai para o TestFlight). Teste no TestFlight antes de enviar para revisão.
12. **Build Android:** `npx eas-cli build --platform android --profile production`; envie o `.aab` na faixa de teste interno do Google Play (`eas submit --platform android`). Pegue a impressão SHA-256 e volte ao item 8.
13. **Teste fechado do Google:** contas pessoais novas exigem 12 testadores por 14 dias seguidos antes de liberar a produção — **se** o console pedir.
14. **Fichas e revisão:** cole textos, questionários e notas de `docs/lojas.md`; crie a conta de demonstração; envie capturas de tela; informe a política `https://medicron.com.br/privacidade`; envie para revisão.
15. **Conferir exclusão de conta** pelo app antes de enviar (Conta → Excluir conta) e remover `EXTRA_TRUSTED_ORIGINS` (item 6).

## F. Virada da web — feita em 2026-11-09

16. Variável `EXPO_PUBLIC_VAPID_PUBLIC_KEY` definida e `medicron-web` republicado.
17. Domínio `medicron.com.br` (e `www`) movido para `medicron-web`; web testada e funcionando.
18. **Pendente, em uma semana estável:** publicar a API de `main` (sem as telas do Next): `vercel --prod --yes` na raiz. Antes disso, nenhum deploy da API a partir de `main` (ver `docs/virada-da-web.md`, "Regra de publicação da API").
