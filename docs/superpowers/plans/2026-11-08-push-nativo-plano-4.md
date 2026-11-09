# Plano 4 — Push nativo (Expo Push Service) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O lembrete de dose chega como notificação nativa no iPhone e no Android (pelo Expo Push Service), com o mesmo texto do Web Push de hoje, e tocar nela abre o app no lugar certo; o Web Push atual continua funcionando.

**Architecture:** Nova tabela `push_devices` (usuário, token do Expo, plataforma) e endpoints `POST/DELETE /api/v1/push/devices`. `dispatchDue` passa a enviar por dois canais (Web Push e Expo) na mesma passada: o horário continua sendo reivindicado uma vez só (compare-and-set em `notified_at`), e só é devolvido para nova tentativa se **nenhum** canal entregou por falha transitória. No app: módulo de registro (permissão, token, API), cartão "Ativar notificações" (Hoje compacto e Conta), roteamento ao tocar na notificação e desregistro ao sair.

**Tech Stack:** `expo-server-sdk` (API), `expo-notifications` e `expo-device` (app, versões do `expo install`, fixadas), Drizzle (migração `0008`), PGlite nos testes, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 4; escolha 5). Base: Planos 1 a 3D, em `main`.

## Global Constraints

- O serviço de envio e o `dispatchDue` mantêm os testes atuais verdes (a assinatura nova é compatível: o canal Expo é um argumento opcional).
- Texto do lembrete **igual** ao do Web Push: título "Hora do cuidado", corpo `"<paciente> — <item> (<dose>)"`.
- Sem tokens, cookies ou corpo de notificação em log (log só contagens e códigos de erro).
- O `url` da notificação é um caminho interno; o app **só** navega para caminhos que passam em `safeNext`.
- Versões novas fixadas exatas (`npx expo install` e remover `^`/`~`).
- TDD em cada tarefa; `npm test` da raiz fica verde; typecheck, lint e `expo export -p web` e `-p ios` limpos.
- **A migração `0008` é aditiva e só é aplicada pelo usuário** (o ambiente de trabalho não tem permissão de escrita no banco de produção). Enquanto não for aplicada, **este plano não é publicado** (`vercel --prod`): o envio de lembretes passaria a consultar uma tabela inexistente.
- Sem credenciais no repositório: projeto Expo/EAS, chaves de push (FCM e APNs) e `EXPO_ACCESS_TOKEN` são configurações do usuário, documentadas em `docs/push-setup.md` (Tarefa 7).
- Fora do escopo: Web Push no app web exportado (vem com a virada da web, Plano 6); recibos do Expo (receipts), badges e som personalizado.

## Review Focus

1. **Um horário, uma notificação:** com Web Push **e** aparelho do mesmo usuário, o horário é reivindicado uma vez; falha transitória em **todos** os canais devolve o horário; falha em um canal e sucesso em outro **não** devolve (não duplica).
2. **Token inválido ou morto:** `DeviceNotRegistered` apaga o aparelho do banco; token que não parece token do Expo é recusado no cadastro (400) e nunca chega ao envio; erro de rede do Expo não apaga nada.
3. **Aparelho compartilhado:** o mesmo token registrado por outro usuário muda de dono (upsert por token); sair da conta desregistra o aparelho **antes** do logout (e se o desregistro falhar, o logout segue); quem sai não recebe mais os lembretes da conta.
4. **Quem recebe:** membros da organização do plano (como o Web Push); usuário em duas contas recebe só os lembretes das contas de que participa; aparelhos de quem saiu da organização não recebem.
5. **Permissão e estados:** negada, não decidida, concedida e "indisponível" (web, simulador sem token, sem `projectId`) mostram o estado certo sem lançar; ativar sem `projectId` mostra um aviso claro e não deixa o cartão preso.
6. **Tocar na notificação:** app aberto, em segundo plano e fechado (partida a frio) abrem o destino; `url` externo ou malformado cai na Hoje; a navegação espera a sessão e a guarda de rotas (não abre tela logada sem sessão).

---

### Task 1: Tabela `push_devices`, corpo compartilhado e serviços

**Files:**
- Modify: `apps/api/src/lib/db/schema.ts` (tabela `pushDevices`, tipo `PushDeviceRow`), `packages/shared/src/api.ts` (`pushDeviceBody`, `PushDeviceBody`)
- Create: `apps/api/drizzle/0008_push_devices.sql` (gerada por `drizzle-kit generate --name push_devices`) e o snapshot
- Modify: `apps/api/src/lib/services/push.ts` (`saveDevice`, `removeDevice`, `listDevicesForOrg`)
- Test: `apps/api/tests/services/push.test.ts` (amplia), `packages/shared/tests/api.test.ts` (amplia)

**Interfaces:**
- Produces:
  - Tabela `push_devices`: `id`, `user_id` (texto, sem FK, como `push_subscriptions`), `token` (único), `platform` (`"ios" | "android"`), `created_at`.
  - `pushDeviceBody`: `{ token: string (começa com "ExponentPushToken[" ou "ExpoPushToken[" e termina com "]"), platform: "ios" | "android" }`.
  - `saveDevice(db, userId, { token, platform }): Promise<void>` (upsert por `token`; o dono passa a ser `userId`), `removeDevice(db, token, userId?): Promise<void>` (com `userId`, só apaga se for dele; sem, remoção do sistema), `listDevicesForOrg(db, orgId): Promise<PushDeviceRow[]>` (aparelhos dos membros da organização, sem duplicar).

- [ ] **Step 1: Write the failing test** — `pushDeviceBody` aceita `ExponentPushToken[abc]` e `ExpoPushToken[abc]` com `ios`/`android`, recusa token solto, vazio e plataforma `web`; serviços (PGlite): `saveDevice` cria; salvar o mesmo token por outro usuário **muda o dono** (uma linha só); `removeDevice` com `userId` de outra pessoa não apaga, sem `userId` apaga; `listDevicesForOrg` devolve só aparelhos de membros da organização (e de quem saiu dela, não), sem duplicatas quando o usuário tem dois aparelhos.
- [ ] **Step 2: Run** `npm test -w packages/shared -- api` e `cd apps/api && npx vitest run tests/services/push.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** o schema, gerar a migração (`npx drizzle-kit generate --name push_devices` em `apps/api`, conferir que é só `CREATE TABLE`), o corpo e os serviços.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde (o PGlite aplica a `0008`).
- [ ] **Step 5: Commit** `feat: tabela push_devices, corpo e serviços de aparelhos`.

### Task 2: Endpoints `/api/v1/push/devices`

**Files:**
- Create: `apps/api/src/app/api/v1/push/devices/route.ts`
- Test: `apps/api/tests/api/push-devices.test.ts`

**Interfaces:**
- Consumes: `route`, `readJson`, `getApiContext`, `json`, `noContent` (Plano 1), `pushDeviceBody`, `saveDevice`, `removeDevice`.
- Produces: `POST /api/v1/push/devices` (corpo `pushDeviceBody`; devolve `{ ok: true }`; 400 com corpo inválido; 401 sem sessão) e `DELETE /api/v1/push/devices` (corpo `{ token }`; só apaga se o aparelho for do usuário; devolve 204; 400 sem token; idempotente).

- [ ] **Step 1: Write the failing test** — no molde de `home-doses.test.ts`: POST válido cria e o aparelho aparece em `listDevicesForOrg` da organização do usuário; POST repetido não duplica; token inválido → 400; sem sessão → 401; DELETE do próprio aparelho → 204 e some; DELETE de aparelho de outro usuário → 204 e **não** apaga; DELETE de token inexistente → 204; versão do app abaixo da mínima → 426 (como as demais rotas).
- [ ] **Step 2: Run** `cd apps/api && npx vitest run tests/api/push-devices.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** a rota.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(api): cadastro e remoção de aparelhos de push`.

### Task 3: Envio pelo Expo e `dispatchDue` com dois canais

**Files:**
- Modify: `apps/api/package.json` (`expo-server-sdk`, versão fixada), `apps/api/src/lib/services/dispatch.ts`, `apps/api/src/app/api/cron/dispatch/route.ts`, `apps/api/src/lib/services/onboarding.ts` (o passo "push" conta também aparelhos nativos)
- Create: `apps/api/src/lib/push/expo-sender.ts`
- Test: `apps/api/tests/services/dispatch.test.ts` (amplia), `apps/api/tests/services/onboarding.test.ts` (amplia), `apps/api/tests/expo-sender.test.ts`, `apps/api/tests/cron-route.test.ts` (ajusta)

**Interfaces:**
- Consumes: `PushPayload`, `PushSender`, `listDevicesForOrg`, `removeDevice`.
- Produces:
  - `type DeviceSender = (devices: PushDeviceRow[], payload: PushPayload) => Promise<{ sent: number; gone: string[] }>` (tokens mortos em `gone`; lança em falha transitória de rede/servidor).
  - `dispatchDue(db, now, send: PushSender, sendDevices?: DeviceSender)`: além do Web Push, envia o mesmo `payload` (com `url`) aos aparelhos da organização; apaga os `gone`; `sent` soma os dois canais. Falha em um canal não impede o outro. O horário só é devolvido (`notified_at = null`) quando **nenhum** canal entregou **e** houve falha em algum.
  - `expoSender: DeviceSender` (em `expo-sender.ts`): valida os tokens com `Expo.isExpoPushToken`, monta mensagens `{ to, title, body, data: { url, tag }, sound: "default", priority: "high", channelId: "default" }`, envia em blocos (`chunkPushNotifications`), lê os tickets: `status "error"` com `details.error === "DeviceNotRegistered"` → `gone`; outros erros de ticket não apagam nada e contam como falha transitória; `EXPO_ACCESS_TOKEN` opcional (`new Expo({ accessToken })`). Sem log de token nem de corpo.
  - A rota do cron passa `webPushSender` e `expoSender`.
  - `getOnboarding`: o passo `push` fica verdadeiro se o usuário tem inscrição Web **ou** aparelho nativo.

- [ ] **Step 1: Write the failing test** — `dispatchDue` com `sendDevices` simulado: manda a mesma mensagem (título, corpo, `url`) aos aparelhos da organização; usuário com Web Push **e** aparelho recebe nos dois e o horário é reivindicado uma vez (segunda passada não reenvia); tokens em `gone` somem do banco; falha (lança) em todos os canais devolve o horário; falha só no Expo com Web Push entregue **não** devolve; sem `sendDevices` o comportamento antigo se mantém (todos os testes atuais passam); aparelho de quem não é membro da organização não recebe. `expoSender`: filtra tokens inválidos antes de enviar, divide em blocos de até 100, `DeviceNotRegistered` vai para `gone`, erro de ticket diferente não apaga e conta como falha, erro de rede propaga; `getOnboarding`: só aparelho nativo já marca "push". Cron: responde 401 sem segredo e chama `dispatchDue` com os dois envios.
- [ ] **Step 2: Run** `cd apps/api && npx vitest run tests/services tests/expo-sender.test.ts tests/cron-route.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** (`npm install expo-server-sdk -w apps/api`, fixar a versão).
- [ ] **Step 4: Run** `npm test` na raiz e `npm run build`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(api): lembretes também por push nativo (Expo)`.

### Task 4: Registro do aparelho no app (módulo, sincronização e sair)

**Files:**
- Modify: `apps/app/package.json` (`expo-notifications`, `expo-device`, via `npx expo install`, fixadas), `apps/app/app.json` (plugin do `expo-notifications`: ícone `assets/notification-icon.png`, cor `#0f766e`), `apps/app/src/lib/session.tsx` (sair desregistra), `apps/app/src/app/_layout.tsx` (sincronização)
- Create: `apps/app/src/lib/push.ts` (+ `push.web.ts` que declara tudo indisponível), `apps/app/src/lib/api/push.ts`, `apps/app/src/lib/push-sync.ts`
- Test: `apps/app/tests/push.test.ts`, ampliar `session.test.tsx`

**Interfaces:**
- Consumes: `apiClient`, `ApiClient`, `useAppSession`, `expo-notifications`, `expo-device`, `expo-constants`.
- Produces:
  - `registerDevice(client, token, platform)` e `unregisterDevice(client, token)` em `lib/api/push.ts` (`POST` e `DELETE /push/devices`).
  - `type PushState = "unsupported" | "denied" | "default" | "enabled"`; `getPushState(): Promise<PushState>` (`unsupported` na web, em aparelho sem suporte e sem `projectId`; `enabled` = permissão concedida **e** token registrado neste aparelho).
  - `enablePush(): Promise<PushState | "no-project">`: pede a permissão (se `default`), cria o canal Android "default" (importância alta), pega o token (`getExpoPushTokenAsync({ projectId })`), registra na API e guarda o token (`SecureStore`) para poder desregistrar; permissão negada → `"denied"`; sem `projectId` → `"no-project"` (sem lançar).
  - `disablePush()`: desregistra na API e apaga o token guardado (nunca lança).
  - `unregisterThisDevice()`: usado ao sair: desregistra com o token guardado, com limite de 3 s, nunca lança (falha de rede não bloqueia o logout).
  - `usePushSync()` (em `push-sync.ts`): com sessão e permissão **já** concedida, garante que o token atual está registrado (o token pode mudar); não pede permissão sozinho.
  - `useAppSession().signOut` chama `unregisterThisDevice()` **antes** de `authClient.signOut()`.

- [ ] **Step 1: Write the failing test** — com `expo-notifications`/`expo-device`/`expo-constants`/SecureStore simulados: `getPushState` para cada combinação (web, sem suporte, sem `projectId`, negada, indeterminada, concedida com e sem token guardado); `enablePush` pede a permissão, cria o canal, registra o token com a plataforma certa e guarda o token; negada devolve `"denied"` sem registrar; sem `projectId` devolve `"no-project"` sem chamar a API; erro de rede ao registrar lança erro tratável (não deixa estado inconsistente); `disablePush` desregistra e limpa o token, e não lança se a API falhar; `unregisterThisDevice` respeita o limite de tempo e não lança; `usePushSync` registra quando a permissão já existe, não pede permissão e não repete o registro com o mesmo token; `signOut` chama o desregistro antes de `authClient.signOut` (ordem) e continua mesmo se o desregistro falhar.
- [ ] **Step 2: Run** `npm test -w apps/app -- push session`. Expected: FAIL.
- [ ] **Step 3: Implement** (`npx expo install expo-notifications expo-device`, fixar as versões, plugin no `app.json`; no jest, mockar os módulos nativos).
- [ ] **Step 4: Run** `npm test -w apps/app -- push session shell`, `npx expo export -p web` e `-p ios`. Expected: PASS; exports sem erro.
- [ ] **Step 5: Commit** `feat(app): registro do aparelho para push nativo`.

### Task 5: Cartão "Ativar notificações" (Hoje e Conta)

**Files:**
- Create: `apps/app/src/components/enable-notifications.tsx` (+ `enable-notifications.web.tsx`, que não renderiza nada até a virada da web)
- Modify: `apps/app/src/components/home/home-view.tsx` (cartão compacto no topo), `apps/app/src/app/(app)/conta.tsx` (cartão completo antes de "Pessoas nesta conta")
- Test: `apps/app/tests/enable-notifications.test.tsx`; ajustar `home-screen.test.tsx` e `conta-screen.test.tsx`

**Interfaces:**
- Consumes: T4 (`getPushState`, `enablePush`, `disablePush`), `Button`, `Icon`, `toast`.
- Produces: `EnableNotifications({ compact? })`, com os textos do site: **default** — caixa `bg-brand-soft` com sino, "Receba avisos no celular" / "Um alerta na hora de cada medicação ou cuidado." e o botão "Ativar" (`accessibilityLabel="Ativar notificações"`); ao tocar, `enablePush`; sucesso `toast.success("Notificações ativadas neste aparelho")`, `"denied"` troca para o estado negado, `"no-project"` mostra `toast.error("Notificações indisponíveis nesta versão do app.")`, erro de rede `toast.error("Não foi possível ativar as notificações.")` e o cartão continua utilizável. **enabled** — cartão "Notificações ativadas" / "Você será avisado neste aparelho." com "Desativar" (somente no modo completo; no `compact` não renderiza). **denied** — "As notificações estão bloqueadas. Libere nas configurações do aparelho para receber os avisos." com o botão "Abrir configurações" (`Linking.openSettings()`). **unsupported** e carregando: não renderiza. Duplo toque em "Ativar" registra uma vez.
  - Na Hoje o cartão compacto fica logo abaixo do título (como no site); na Conta o completo fica no topo, abaixo do cabeçalho.

- [ ] **Step 1: Write the failing test** — cada estado (default, enabled completo e compacto, denied, unsupported, carregando) com o texto exato; ativar com sucesso, negado, `no-project` e erro de rede; desativar volta ao estado default; "Abrir configurações" chama `Linking.openSettings`; duplo toque ativa uma vez; Hoje e Conta mostram o cartão (compacto e completo) nos testes de tela.
- [ ] **Step 2: Run** `npm test -w apps/app -- enable-notifications home-screen conta-screen`. Expected: FAIL.
- [ ] **Step 3: Implement** o componente e os dois pontos de uso.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `-p ios`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): cartão para ativar notificações na Hoje e na Conta`.

### Task 6: Tocar na notificação (roteamento) e notificação com o app aberto

**Files:**
- Create: `apps/app/src/lib/notification-routing.ts` (`notificationTarget`, `useNotificationRouting`), `apps/app/src/lib/notification-handler.ts`
- Modify: `apps/app/src/app/_layout.tsx` (liga o handler em primeiro plano e o roteamento)
- Test: `apps/app/tests/notification-routing.test.tsx`

**Interfaces:**
- Consumes: `expo-notifications`, `safeNext` (shared), `useRouter`, `useAppSession`.
- Produces:
  - `notificationTarget(data: unknown): string` — `data.url` se for caminho interno aceito por `safeNext`; qualquer outra coisa (ausente, externo, `//`, `javascript:`) → `"/"`.
  - `setupNotificationHandler()` — com o app aberto, a notificação aparece (banner, lista e som), sem badge.
  - `useNotificationRouting()` — com sessão pronta (`useAppSession().status === "signedIn"`), trata a notificação que abriu o app (partida a frio: `getLastNotificationResponseAsync`) **uma vez** e as respostas seguintes (`addNotificationResponseReceivedListener`), navegando com `router.push(notificationTarget(data))`; sem sessão, guarda o destino e navega depois do login.

- [ ] **Step 1: Write the failing test** — `notificationTarget`: `"/pacientes"` ok, `"/"` ok, `"https://evil.com"`, `"//evil.com"`, `"javascript:alert(1)"`, `undefined` e dado que não é objeto → `"/"`; handler configurado com banner, lista e som e sem badge; partida a frio com resposta pendente navega uma vez (não repete em re-render); resposta com o app aberto navega; sem sessão não navega e navega depois que a sessão chega; remove o listener ao desmontar.
- [ ] **Step 2: Run** `npm test -w apps/app -- notification-routing`. Expected: FAIL.
- [ ] **Step 3: Implement** os módulos e ligar no layout raiz.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `-p ios`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): abrir o app no lugar certo ao tocar na notificação`.

### Task 7: Guia de configuração do push e verificação ponta a ponta

**Files:**
- Create: `docs/push-setup.md`
- Modify: `README.md` (link para o guia; nota de que o Plano 4 não é publicado antes da migração `0008`), `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 4 como concluída no código, pendente de configuração e teste em aparelho)

- [ ] **Step 1: Escrever** `docs/push-setup.md` com, em ordem e comandos exatos: aplicar a migração (`cd apps/api && node --env-file=.env.local ../../node_modules/drizzle-kit/bin.cjs migrate`); criar o projeto EAS (`npx eas-cli init` e `eas login`) e copiar o `projectId` para o `extra.eas.projectId` do `app.json`; chave APNs (Apple Developer → Keys → "Apple Push Notifications service") e conta de serviço FCM v1 (Firebase) enviadas por `eas credentials`; opcional `EXPO_ACCESS_TOKEN` na Vercel; publicar a API (`vercel --prod`) **depois** da migração; checklist de teste em aparelho real (ativar, receber um lembrete real com o app fechado, tocar e cair na Hoje, desativar, sair e confirmar que parou, outro usuário no mesmo aparelho).
- [ ] **Step 2: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` e `-p ios` em `apps/app`. Expected: tudo verde.
- [ ] **Step 3: Revisão final** da branch por um revisor independente (modelo mais capaz); corrigir Critical e Important com teste antes; Minor ao ledger.
- [ ] **Step 4: Mesclar** em `main`; **não publicar** (migração pendente) e registrar no README e no relatório final como passo do usuário.
- [ ] **Step 5: Commit** `docs: guia de configuração do push nativo`.
