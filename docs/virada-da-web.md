# Virada da web (Plano 6)

Hoje `medicron.com.br` está no projeto Vercel **medicron** (o Next, com as telas antigas). A virada move o domínio para o projeto **medicron-web** (o app Expo exportado para web, estático), que reescreve `/api/*`, `/privacidade` e `/.well-known/*` para o projeto da API (`medicron.vercel.app`). O navegador continua vendo um host só (`medicron.com.br`): o mesmo cookie, o mesmo segredo, sem CORS.

## Já feito (2026-11-08)

- Projeto `medicron-web` criado (raiz `apps/app`, build `npx expo export -p web`, saída `dist`), com um deploy em **https://medicron-web.vercel.app** (protegido por login da Vercel, sem domínio próprio ainda).
- A API publicada não redireciona mais `/api`, `/privacidade` e `/.well-known` de `medicron.vercel.app` para `medicron.com.br` (sem isso, as reescritas entrariam em laço).
- O site estático desliga o cache de reescrita externa para `/api/*` (cabeçalho `x-vercel-enable-rewrite-caching: 0`): a API é por usuário e nada dela pode ser compartilhado entre contas.
- Verificado no deploy, com `vercel curl`: `/`, `/pacientes/abc`, `/convite/xyz` devolvem o app (200); `sw.js` (`application/javascript`), `manifest.webmanifest` e `icons/*` são arquivos (200); `/privacidade`, `/api/auth/get-session`, `/api/v1/config` vêm da API; `/api/cron/dispatch` chega à API (401 sem segredo); `/gatos/x` redireciona (308) para `/pacientes/x`.

## O que só você faz

1. **Variável do site estático** (a chave pública do Web Push, igual à `NEXT_PUBLIC_VAPID_PUBLIC_KEY` da API; inscrições existentes continuam valendo):
   ```bash
   cd apps/app && vercel env add EXPO_PUBLIC_VAPID_PUBLIC_KEY production
   ```
2. **Publicar o site estático com a variável** (da raiz do repositório, projeto `medicron-web`):
   ```bash
   VERCEL_ORG_ID=team_LQIw6FRi4hvzyz0FewKkMWES VERCEL_PROJECT_ID=prj_6tLxVdRNAEA8x391X6yPrlCxGalV vercel deploy --prod --yes
   ```
   (O deploy de hoje já foi feito com a chave por `--build-env`; este passo só deixa a variável permanente.)
3. **Ensaio do login pelo site estático** (antes da troca): o login é um POST com `Origin`, e o preview tem outra origem. Acrescente `https://medicron-web.vercel.app` à `EXTRA_TRUSTED_ORIGINS` da API (lista separada por vírgula; hoje tem `exp://**`), publique a API **a partir de um checkout sem a Tarefa 4** (ver "Regra de publicação da API"), entre em `https://medicron-web.vercel.app`, confira dados, ative o Web Push e saia; depois retire essa origem.
3b. **Ensaio da sessão antiga** — o cookie é do host, então só vale no domínio real: com uma aba **já logada** no site atual, faça a troca (passo 4), em horário de pouco uso, e recarregue a aba: deve continuar logada, sem passar pela tela de entrada.
4. **A troca do domínio** (Vercel → Settings → Domains): em **medicron**, remova `medicron.com.br`; em **medicron-web**, adicione `medicron.com.br` e `www.medicron.com.br` (este como redirecionamento para `medicron.com.br`). Não mude `BETTER_AUTH_URL`, o segredo nem os cookies. O projeto **medicron** (a API) continua em `medicron.vercel.app`.
5. **Conferir** (em `https://medicron.com.br`): login e dados; F5 em `/pacientes`; o aviso de notificações em Conta (Web Push); `curl -i https://medicron.com.br/privacidade`; `curl -I https://www.medicron.com.br` (deve redirecionar para `medicron.com.br`); o agendador externo (`GET /api/cron/dispatch` com `Authorization`) deve continuar respondendo 200.
6. **Reversão** (minutos): no passo 4, devolva o domínio ao projeto **medicron** (o último deploy dele ainda tem as telas do Next).

## Regra de publicação da API

- **Antes da troca**, qualquer deploy da API deve sair de um checkout sem a Tarefa 4 (por exemplo `git revert --no-edit ba5fef1` num branch temporário, ou o commit `f28c971`): o domínio ainda está no projeto `medicron` e a web precisa das telas.
- **Depois que a API for publicada com a Tarefa 4**, devolver o domínio deixa de ser uma reversão válida: primeiro `git revert` do commit "refactor(api): o Next passa a ser só a API" e novo deploy da API, **só então** devolver o domínio.
- Nenhum dos dois projetos tem integração com o Git: só publica o que você mandar pela CLI.

## Só depois de uma semana estável

O código em `main` já **não tem mais as telas do Next** (Tarefa 4). **Não publique o projeto da API com esse código antes da troca do domínio** (derrubaria a web). Depois da troca e de uma semana sem problemas: `vercel --prod --yes` na raiz (projeto `medicron`). Se algo precisar voltar depois disso: `git revert` do commit "refactor(api): o Next passa a ser só a API" e novo deploy da API.

## Depois da virada

- Conta → Excluir conta passa a existir também na web (é o mesmo app).
- `DOMAIN_REDIRECT=1` e o redirecionamento do host antigo podem sair do `vercel.ts` em outro momento.
- A chave `NEXT_PUBLIC_VAPID_PUBLIC_KEY` continua necessária na API (o envio do Web Push usa).
