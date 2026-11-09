# Virada da web Implementation Plan (Plano 6)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execução nativa, decidida pelo usuário). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Servir o app Expo exportado para web como um site estático em `medicron.com.br`, deixando o Next só como API (mais `/privacidade` e `/.well-known/*`), sem derrubar sessões nem o Web Push.

**Architecture:** Um segundo projeto Vercel (`medicron-web`, raiz `apps/app`) publica `expo export -p web` (`dist/`) e reescreve `/api/*`, `/privacidade` e `/.well-known/*` para o projeto da API (host próprio `medicron.vercel.app`), de modo que o navegador só vê `medicron.com.br` (sem CORS, cookie do mesmo host). O Web Push passa para o app Expo (`push.web.ts`, `sw.js`, manifest e ícones em `apps/app/public/`). Depois do ensaio, o domínio sai do projeto atual e vai para o novo; as telas do Next são apagadas.

**Tech Stack:** Expo SDK 58 (web, `output: "single"`), Expo Router, jest-expo/RNTL, Vercel (`vercel.json` estático), Next (API), vitest.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (escolhas 4, 8, 9, 13; Etapa 6; seção do domínio).

## Global Constraints

- Mesmo host, mesmo `BETTER_AUTH_SECRET`, mesmas opções de cookie: nada disso muda (escolha 9). `BETTER_AUTH_URL` continua `https://medicron.com.br`.
- O Next **não** é desligado antes do ensaio em preview com uma sessão criada antes (escolha 9). Trocar o domínio de projeto em produção é ação do usuário (passo-a-passo em `docs/virada-da-web.md`).
- Manifest, `sw.js` e ícones continuam servidos nas mesmas URLs (`/manifest.webmanifest`, `/sw.js`, `/icons/*`) — o Web Push e o PWA instalado dependem delas (escolha 13).
- Na web a API é **same-origin**: `API_URL` vazio (caminhos relativos) quando `Platform.OS === "web"` e `EXPO_PUBLIC_API_URL` não está definido; links de convite usam `window.location.origin`.
- Textos em português do Brasil, com acentos. Nenhum segredo no repositório (chave VAPID pública vai por `EXPO_PUBLIC_VAPID_PUBLIC_KEY`).
- A chave VAPID pública é a mesma de hoje (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`): inscrições existentes continuam válidas.

## Review Focus

1. Uma sessão criada no Next antes da virada continua válida no site estático (cookie `better-auth` lido via rewrite `/api/*`; `Set-Cookie` sem `Domain` fica no host `medicron.com.br`).
2. Link profundo recarregado (F5 em `/pacientes/abc`, `/convite/xyz`) devolve o app, não 404; arquivos reais (`sw.js`, `manifest.webmanifest`, `icons/*`) **não** caem no fallback de `index.html`.
3. Chamada do agendador externo `GET /api/cron/dispatch` com `Authorization` continua chegando à API pelo domínio novo.
4. Web Push: quem já tinha inscrição não perde; sair da conta remove a inscrição; iPhone fora da tela de início vê a orientação "Adicionar à Tela de Início".
5. `/privacidade`, `/.well-known/*` e `/convite/*` (link universal sem o app) continuam respondendo no domínio; `/gatos` continua redirecionando para `/pacientes`.

---

### Task 1: Web usa a API do mesmo domínio e a pasta `public/`

**Files:**
- Modify: `apps/app/src/lib/api-url.ts`, `apps/app/tests/api-url.test.ts`
- Create: `apps/app/public/manifest.webmanifest`, `apps/app/public/sw.js`, `apps/app/public/icons/*` (copiados de `apps/api/public`), `apps/app/src/app/+html.tsx`
- Test: `apps/app/tests/web-public.test.ts`

**Interfaces:**
- Produces: `resolveApiUrl(value: string | undefined, platform?: string, origin?: string): string` — com `value` vazio: `""` na web (relativo) e produção nas demais; `API_URL` usa `Platform.OS`. `inviteLink(id, API_URL)` (de `@medicron/shared`) precisa receber uma base absoluta: criar `inviteBase(): string` em `api-url.ts` que devolve `window.location.origin` na web quando `API_URL === ""`, senão `API_URL`; trocar os dois usos de `API_URL` em `invite-form.tsx` e `invitation-row.tsx`.

- [ ] **Step 1: Testes (RED)** em `api-url.test.ts`: `resolveApiUrl(undefined, "web")` → `""`; `resolveApiUrl(undefined, "ios")` → `"https://medicron.com.br"`; `resolveApiUrl("http://x/", "web")` → `"http://x"`; `inviteBase()` na web (jsdom ausente: injetar `origin`) devolve a origem. Em `web-public.test.ts`: `public/manifest.webmanifest` é JSON válido com `start_url "/"`, `display "standalone"`, 3 ícones que existem em `public/icons/`; `public/sw.js` contém os listeners `push` e `notificationclick`; `+html.tsx` exporta componente cuja árvore (via `renderToStaticMarkup`) tem `<link rel="manifest" href="/manifest.webmanifest">`, `<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">` e `<meta name="theme-color" content="#0d9488">`.
- [ ] **Step 2: Rodar** `npx jest tests/api-url.test.ts tests/web-public.test.ts` (em `apps/app`). Expected: FAIL.
- [ ] **Step 3: Implementar** `resolveApiUrl`/`inviteBase`; copiar com `cp -R` os arquivos de `apps/api/public/{manifest.webmanifest,sw.js,icons}` para `apps/app/public/` (a pasta antiga só é apagada na Task 4); criar `+html.tsx` (padrão do Expo Router: `ScrollViewStyleReset`, `lang="pt-BR"`, os três elementos acima).
- [ ] **Step 4: Rodar** os testes do passo 2 e `npx jest` completo. Expected: PASS.
- [ ] **Step 5: Verificar** `npx expo export -p web` e que `dist/` contém `sw.js`, `manifest.webmanifest`, `icons/icon-192.png`. Commit `feat(app): web usa a API do mesmo domínio e serve manifest e service worker`.

### Task 2: Web Push no app Expo

**Files:**
- Modify: `apps/app/src/lib/push.web.ts`, `apps/app/src/lib/push.ts` (tipo `PushState` ganha `"needs-install"`; mover o tipo para `apps/app/src/lib/push-state.ts` importado pelos dois), `apps/app/src/components/enable-notifications.tsx`
- Delete: `apps/app/src/components/enable-notifications.web.tsx`
- Create: `apps/app/src/lib/api/web-push.ts`
- Test: `apps/app/tests/web-push.test.ts`, `apps/app/tests/enable-notifications-web.test.tsx`

**Interfaces:**
- Produces: `subscribeWebPush(api: ApiClient, sub: PushSubscriptionJSON): Promise<void>` (POST `/api/push/subscribe`, corpo idêntico ao do Next: `sub.toJSON()`) e `unsubscribeWebPush(api, endpoint: string): Promise<void>` (DELETE com `{ endpoint }`), em `lib/api/web-push.ts`.
- Produces (push.web.ts, mesma assinatura do nativo): `getPushState(): Promise<PushState>` (`"needs-install"` = iOS fora do modo standalone sem `PushManager`; `"unsupported"` sem service worker; `"denied"`; `"enabled"` só com permissão **e** inscrição; senão `"default"`), `enablePush(): Promise<"enabled" | "denied" | "no-project">` (`"no-project"` quando falta `EXPO_PUBLIC_VAPID_PUBLIC_KEY`), `disablePush()`, `unregisterThisDevice()` (nunca lança; usa `unsubscribeWebPush` + `sub.unsubscribe()`), `syncPushRegistration()` (sem ação na web).

- [ ] **Step 1: Testes (RED)** `web-push.test.ts` com `navigator`/`Notification`/`window.matchMedia` simulados via `Object.defineProperty`/`globalThis`: estados `unsupported`, `needs-install` (UA iPhone, sem `PushManager`, não standalone), `denied`, `default` (sem inscrição), `enabled`; `enablePush` pede permissão, inscreve com `userVisibleOnly: true` e a chave VAPID convertida (`urlBase64ToUint8Array`), registra no servidor e devolve `"enabled"`; permissão negada → `"denied"` sem chamar o servidor; falha do servidor após inscrever → desfaz a inscrição local e lança (para o componente mostrar erro); `unregisterThisDevice` com offline não lança. `enable-notifications-web.test.tsx`: variante `compact` some quando `enabled`, mostra a mensagem do iPhone no estado `needs-install` ("No iPhone, para receber avisos: toque em Compartilhar → Adicionar à Tela de Início e abra o Medicron por lá.") e a do bloqueio em `denied`.
- [ ] **Step 2: Rodar** os dois arquivos. Expected: FAIL.
- [ ] **Step 3: Implementar** os itens da seção Interfaces; `EnableNotifications` ganha os dois textos web por estado; `unregisterThisDevice` já é chamado em `session.tsx` (logout) e `delete-account.tsx`.
- [ ] **Step 4: Rodar** `npx jest`, `npm run typecheck`, `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): Web Push no app Expo (service worker, inscrição e aviso para iPhone)`.

### Task 3: Projeto estático da Vercel (`vercel.json` da web)

**Files:**
- Create: `apps/app/vercel.json`, `apps/app/scripts/vercel-config.ts` (gera o JSON a partir de `API_ORIGIN`; o teste importa a função), `apps/app/tests/vercel-web.test.ts`

**Interfaces:**
- Produces: `buildVercelConfig(apiOrigin: string): VercelWebConfig`; `vercel.json` é o resultado com `apiOrigin = "https://medicron.vercel.app"`. Campos: `buildCommand: "npx expo export -p web"`, `outputDirectory: "dist"`, `installCommand: "cd ../.. && npm ci"`, `cleanUrls: false`, `redirects` (`/gatos` e `/gatos/:path*` → `/pacientes...`, permanentes), `rewrites` na ordem: `/api/:path*` → `${apiOrigin}/api/:path*`; `/privacidade` → `${apiOrigin}/privacidade`; `/.well-known/:path*` → `${apiOrigin}/.well-known/:path*`; por último `/((?!.*\\.[a-zA-Z0-9]+$).*)` → `/index.html` (qualquer caminho sem extensão cai no app; `sw.js`, `manifest.webmanifest`, `icons/*`, `_expo/*` são arquivos e ficam de fora); `headers`: `/sw.js` com `Cache-Control: no-cache` e `Service-Worker-Allowed: /`.

- [ ] **Step 1: Testes (RED)**: ordem das reescritas (API antes do fallback); `/api/cron/dispatch`, `/api/auth/get-session`, `/api/v1/push/devices`, `/privacidade`, `/.well-known/assetlinks.json` casam com reescritas para a API; `/pacientes/abc`, `/convite/xyz`, `/` casam **só** com o fallback; `/sw.js`, `/manifest.webmanifest`, `/icons/icon-192.png` **não** casam com nenhuma reescrita (usar `path-to-regexp` já presente no monorepo via Next, ou implementar o casamento no teste com a regex fornecida); redirecionamentos de `/gatos`; `vercel.json` do disco é igual a `buildVercelConfig("https://medicron.vercel.app")`.
- [ ] **Step 2: Rodar** `npx jest tests/vercel-web.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** `buildVercelConfig` e gerar `vercel.json` (`node scripts/vercel-config.ts > vercel.json` via script `npm run vercel-config`).
- [ ] **Step 4: Rodar** o teste e `npx jest` completo. Expected: PASS. Commit `feat(app): configuração do projeto estático da Vercel`.

### Task 4: O Next vira só API

**Files:**
- Delete: `apps/api/src/app/(app)/**`, `apps/api/src/app/(auth)/**`, `apps/api/src/app/convite/**`, `apps/api/src/components/**` (tudo, exceto o que `privacidade` usar), `apps/api/src/proxy.ts`, `apps/api/public/{sw.js,manifest.webmanifest,icons,*.svg}`, `apps/api/src/lib/push/client.ts`, os testes de UI, `pwa.test.ts`, `proxy-public.test.ts`, e demais testes das telas removidas
- Modify: `apps/api/src/app/layout.tsx` (sem `ThemeProvider`/manifest/PWA), `apps/api/next.config.ts` (remove `redirects` de `/gatos`, que migraram para o `vercel.json` da web), `apps/api/vercel.ts`, `apps/api/package.json` (remove dependências que ficaram sem uso), `apps/api/tests/legacy-routes.test.ts`, `apps/api/tests/vercel-config.test.ts`
- Test: `apps/api/tests/api-only.test.ts`

**Interfaces:**
- Consumes: `apps/app/vercel.json` (Task 3) assume que `/privacidade`, `/.well-known/*` e `/api/*` continuam no Next.

- [ ] **Step 1: Testes (RED)** `api-only.test.ts`: lista os diretórios de `src/app` e afirma que só existem `api`, `.well-known`, `privacidade` (mais `layout.tsx`, `not-found.tsx`, `error.tsx`, `global-error.tsx`, `globals.css`, `favicon.ico`); `public/` não contém `sw.js` nem `manifest.webmanifest`; `layout.tsx` não menciona `manifest`. A página `/privacidade` continua renderizando (`privacy-page.test.tsx` fica) e ainda é pública sem o `proxy`.
- [ ] **Step 2: Rodar** `npx vitest run tests/api-only.test.ts`. Expected: FAIL.
- [ ] **Step 3: Apagar** o que a lista de arquivos diz; rodar `npm run build` e `npm run lint` para achar importações órfãs; remover dependências sem uso e atualizar o lock com `npm install`; manter as variáveis `NEXT_PUBLIC_VAPID_PUBLIC_KEY` (a VAPID pública agora é lida pelo app: documentar `EXPO_PUBLIC_VAPID_PUBLIC_KEY` no ambiente da web).
- [ ] **Step 4: Rodar** `npm test` da raiz, `npm run build`, `npm run lint`, `npm run typecheck`. Expected: PASS. Commit `refactor(api): o Next passa a ser só a API`.

### Task 5: Guia da virada, ensaio e fechamento

**Files:**
- Create: `docs/virada-da-web.md`
- Modify: `docs/passos-do-usuario.md`, `README.md`, spec (Etapa 6: código concluído; virada do domínio depende do usuário)

- [ ] **Step 1: Escrever** `docs/virada-da-web.md`, em ordem e com comandos: (1) criar o projeto `medicron-web` (`cd apps/app && vercel link`; raiz `apps/app`; "Include source files outside of the Root Directory" ligado) e a variável `EXPO_PUBLIC_VAPID_PUBLIC_KEY` (mesmo valor de `NEXT_PUBLIC_VAPID_PUBLIC_KEY`); (2) `vercel` (preview) e conferir no preview, com `curl` e no navegador: `/api/auth/get-session` via reescrita, F5 em `/pacientes` e `/convite/x`, `sw.js` 200, `/privacidade`; (3) **ensaio da sessão antiga**: um cookie de sessão é do host, então o preview não o enxerga; o ensaio real é a própria troca (passo 4) feita fora do horário de uso, com a aba logada antes aberta: depois da troca, recarregar e ver que continua logada; (4) **a troca**: na Vercel, remover `medicron.com.br` do projeto atual e adicioná-lo ao `medicron-web` (o projeto da API mantém `medicron.vercel.app`; `BETTER_AUTH_URL` e o segredo não mudam); (5) testar o agendador externo (`GET https://medicron.com.br/api/cron/dispatch` com `Authorization`); (6) **reversão** em minutos: devolver o domínio ao projeto atual (que segue com o último deploy, ainda com as telas do Next). Só **depois de uma semana estável** publicar o projeto da API com o código da Task 4 (sem telas); se algo precisar voltar depois disso, `git revert` do commit da Task 4 e novo deploy.
- [ ] **Step 2: Atualizar** `docs/passos-do-usuario.md` (nova seção F "Virada da web") e README (estado do app: web Expo pronta; domínio pendente).
- [ ] **Step 3: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` e `-p ios`.
- [ ] **Step 4: Revisão final** da branch por um revisor independente (modelo mais capaz); corrigir Critical e Important com teste antes; Minor ao ledger.
- [ ] **Step 5: Mesclar** em `main`. **Não publicar o projeto da API** com a Task 4 antes de o domínio trocar: um deploy do Next sem telas, com o domínio ainda nele, quebraria a web. Commit `docs: guia da virada da web`.
