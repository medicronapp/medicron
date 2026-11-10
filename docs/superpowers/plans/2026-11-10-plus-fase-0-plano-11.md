# Medicron Plus, fase 0 (escopo B) Implementation Plan (Plano 11)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execução nativa). Steps use checkbox (`- [ ]`) syntax.

**Goal:** O Medicron passa a ter plano grátis com limites e **Medicron Plus** (assinatura por conta, mensal e anual com 7 dias grátis no anual), cobrado pela App Store e pelo Google Play via RevenueCat, com o servidor como fonte da verdade. Sem relatório em PDF.

**Architecture:** Tabela `org_subscriptions` (uma linha por conta/organização) guarda o plano ativo e a validade; um **webhook do RevenueCat** (e uma sincronização sob demanda) a atualiza; serviços da API consultam o plano para aplicar os **limites** (criar paciente, convidar/aceitar pessoas, ver histórico), e o `/me` devolve plano, limites e uso. No app, `react-native-purchases` (só nativo) faz a compra com o **id da organização como `app_user_id`**; uma tela `/plus` mostra o paywall; a web só mostra o plano. Termos de uso e política de privacidade atualizados.

**Tech Stack:** Next (API, vitest, drizzle + PGlite nos testes), `better-auth` organization (`membershipLimit`, `invitationLimit`), Expo/React Native (jest-expo, RNTL 14), `react-native-purchases` (RevenueCat), EAS.

**Spec:** `docs/monetizacao.md` (decisões de 10/11/2026: escopo B, sem PDF, teste de 7 dias da loja, conta pessoa física).

## Global Constraints

- Português do Brasil com acentos. Nomes de domínio: "assinatura" (tabela `org_subscriptions`, serviço `subscription.ts`) para **não confundir** com "plano de cuidado" (`care_plans`, "rotina"), que já existe.
- **Regra de ouro (inegociável):** lembretes, a tela Hoje e marcar "Feito/Pular" **nunca** são bloqueados. Os limites valem só para **criar** paciente, **convidar/aceitar** pessoa e **ver dia com mais de 30 dias**. Uma conta que ficou acima do limite (acabou a assinatura) **mantém e continua avisando** o que já existe; nada é arquivado, apagado ou silenciado.
- **Limites** (fonte única em `@medicron/shared`): grátis = **2 pacientes**, **2 pessoas na conta**, **30 dias** de histórico; Plus = pacientes **ilimitados**, **8 pessoas**, histórico **ilimitado**. Limites só podem **afrouxar** depois do lançamento.
- **O servidor decide.** O app só exibe e leva ao paywall; nenhuma regra de limite vive só no cliente. Erro de limite da API: **HTTP 402**, `code: "plan_limit"`, com `limit` (`patients` | `members` | `history`).
- Ids fixos: assinatura/grupo "Medicron Plus"; produtos `app.medicron.plus.monthly` e `app.medicron.plus.annual`; **entitlement `plus`**; offering `default`. O `app_user_id` do RevenueCat é o **id da organização**. **Preços e a oferta de 7 dias vêm da loja** (o app mostra o `priceString` e a descrição da oferta devolvidos pelo SDK; **nenhum preço no código**).
- Compra **só no app nativo** (iOS/Android). Na web a tela de plano mostra o estado e orienta a assinar pelo celular (a Apple proíbe levar o iOS a pagamento externo).
- **Segredos só por variável de ambiente** (API: `REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY`; app: `EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, chaves **públicas** do SDK). Nunca commitar valores.
- **Sem rastreadores/analytics de terceiros** (a política diz que não há); o RevenueCat só cuida de compras e deve constar na política, no "App Privacy" da Apple e na segurança de dados do Google.
- Nada de promessa médica; "Medicron Plus" não pode dizer que é "mais seguro": o grátis também avisa.
- **Não publicar a API a partir de `main` antes de uma semana estável da web** (`docs/virada-da-web.md`, "Regra de publicação da API"): este plano entrega o **código**; a publicação e o novo build iOS/Android são passos do usuário (Tarefa 11).

## Review Focus

1. **O grátis nunca perde o essencial:** conta com 3+ pacientes ou 3+ pessoas (por exemplo, após cancelar) continua **recebendo lembretes, vendo Hoje e marcando doses**; só não cria novos.
2. **Webhook seguro e idempotente:** sem o segredo → 401; evento repetido (mesmo `id`) ou **fora de ordem** (`event_timestamp_ms` mais antigo) não regride o plano; `app_user_id` que não é uma organização existente (ex.: `$RCAnonymousID:`) é ignorado com 200; `EXPIRATION` remove o Plus; `CANCELLATION` mantém até a validade.
3. **Limite de pessoas pelo `better-auth`:** aceitar convite acima do limite falha; convidar acima de `limite − membros` falha; erros chegam ao app como paywall (não como mensagem em inglês).
4. **Quem assina vale para a conta inteira** (todos os membros veem o Plus) e **só dono/administrador compra**; membro vê "peça a quem administra".
5. **Reembolso/estorno e fim do teste** voltam a conta ao grátis sem apagar nada; conta excluída leva a assinatura junto (cascata) e a tela de exclusão avisa que a assinatura da loja precisa ser cancelada pelo usuário.

---

### Task 1: Limites e tipos compartilhados

**Files:**
- Create: `packages/shared/src/subscription.ts`
- Modify: `packages/shared/src/api.ts` (`MeDto`), `packages/shared/src/index.ts`
- Test: `packages/shared/tests/subscription.test.ts`

**Interfaces:**
- Produces: `type Tier = "free" | "plus"`; `type Limits = { patients: number | null; members: number; historyDays: number | null }` (`null` = ilimitado); `FREE_LIMITS`, `PLUS_LIMITS: Limits`; `limitsFor(tier: Tier): Limits`; `historyCutoffKey(todayKey: string, tier: Tier): string | null` (menor dia permitido `AAAA-MM-DD`, `null` = sem corte; usa `addDays` existente); `PLUS_ENTITLEMENT = "plus"`, `PRODUCT_IDS = { monthly: "app.medicron.plus.monthly", annual: "app.medicron.plus.annual" }`; `type SubscriptionDto = { tier: Tier; plusUntil: string | null; source: "apple" | "google" | "manual" | null; willRenew: boolean; limits: Limits; usage: { patients: number; members: number } }`; `MeDto` ganha `subscription: SubscriptionDto`.

- [ ] **Step 1: Testes (RED)**: `limitsFor("free")` = `{ patients: 2, members: 2, historyDays: 30 }`; `limitsFor("plus")` = `{ patients: null, members: 8, historyDays: null }`; `historyCutoffKey("2026-11-10", "free")` = `"2026-10-11"`, e `null` para `plus`; vira o mês/ano (`"2026-01-05"` → `"2025-12-06"`); constantes dos ids (`app.medicron.plus.monthly`/`annual`, `plus`); os limites do grátis são **menores ou iguais** aos do Plus em tudo (guarda contra inversão).
- [ ] **Step 2: Rodar** `cd packages/shared && npx vitest run tests/subscription.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** os tipos e funções acima; exportar no `index.ts`; acrescentar `subscription` ao `MeDto`.
- [ ] **Step 4: Rodar** a suíte do shared e o `tsc` dos três pacotes (o `MeDto` novo quebra quem constrói `MeDto` sem `subscription`: ajustar `apps/app/scripts/demo-data.ts` e fixtures dos testes com uma constante `freeSubscription`). Expected: PASS.
- [ ] **Step 5: Commit** `feat(shared): limites do grátis e do Plus, SubscriptionDto`.

### Task 2: Tabela de assinaturas e serviço

**Files:**
- Create: `apps/api/drizzle/0009_org_subscriptions.sql` (gerado com o `drizzle-kit` do projeto; conferir o `meta/_journal.json`), `apps/api/src/lib/services/subscription.ts`
- Modify: `apps/api/src/lib/db/schema.ts`
- Test: `apps/api/tests/services/subscription.test.ts`

**Interfaces:**
- Produces: tabela `org_subscriptions` (`organization_id` PK com FK `organization.id` **ON DELETE CASCADE**, `plus_until timestamptz null`, `source text null` (`apple`|`google`|`manual`), `product_id text null`, `will_renew boolean default false`, `last_event_ms bigint default 0`, `updated_at`); `getSubscription(db: Db, orgId: string, now: Date): Promise<SubscriptionDto>` (**Plus** só se `plus_until > now`; calcula `usage` = pacientes não arquivados e membros); `grantPlus(db: Db, orgId: string, until: Date, source: "manual" | "apple" | "google", opts?: { productId?: string; willRenew?: boolean; eventMs?: number }): Promise<void>` (upsert).
- Consumes: `FREE_LIMITS`/`PLUS_LIMITS`, `SubscriptionDto` (Tarefa 1).

- [ ] **Step 1: Testes (RED)**: conta sem linha = `tier: "free"`, limites grátis, `usage` correto (paciente arquivado **não** conta); depois de `grantPlus(..., amanhã)` = `plus` com `plusUntil`; **depois da validade volta a `free`** sem apagar nada; `grantPlus` chamado de novo atualiza (upsert, uma linha só); `usage.members` conta membros da organização; apagar a organização apaga a linha (cascata).
- [ ] **Step 2: Rodar** `cd apps/api && npx vitest run tests/services/subscription.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** o schema (drizzle) e a migração `0009` (o PGlite dos testes aplica as migrações), e o serviço.
- [ ] **Step 4: Rodar** o teste e a suíte da API. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): tabela org_subscriptions e serviço de assinatura`.

### Task 3: Aplicar os limites (pacientes, histórico e pessoas)

**Files:**
- Modify: `apps/api/src/lib/services/subscription.ts`, `apps/api/src/app/api/v1/patients/route.ts`, `apps/api/src/app/api/v1/home/route.ts`, `apps/api/src/lib/auth.ts`, `apps/api/src/lib/api/errors.ts` (campo opcional `details` no `ApiError`, devolvido por `route()`)
- Test: `apps/api/tests/api/plan-limits.test.ts`, `apps/api/tests/auth-member-limits.test.ts`

**Interfaces:**
- Produces: `assertCanCreatePatient(db, orgId, now): Promise<void>` e `assertCanViewDay(db, orgId, dayKey: string, now: Date): Promise<void>` (lançam `ApiError(402, "plan_limit", mensagem em pt-BR, { limit: "patients" | "history" })`); `createAuth` passa a configurar `organization({ membershipLimit: async (_u, org) => limits.members, invitationLimit: async ({ organization }) => Math.max(0, limits.members - membrosAtuais) })` consultando `getSubscription`.
- Consumes: `getSubscription` (Tarefa 2).

- [ ] **Step 1: Testes (RED)** de API: com 2 pacientes no grátis, `POST /patients` → **402** `{ code: "plan_limit", limit: "patients" }` e **não** cria; com Plus (via `grantPlus`) cria o 3º; **arquivar** um paciente libera uma vaga; `GET /home?dia=` com dia **mais antigo que 30 dias** no grátis → 402 `{ limit: "history" }`, o dia de 30 dias atrás **passa**, e no Plus passa sempre; **Hoje (sem `dia`) nunca é bloqueado**, mesmo com a conta acima dos limites; **regra de ouro**: conta grátis com 3 pacientes (criados enquanto era Plus) continua listando, e `GET /home` devolve as doses dos 3. Testes do `better-auth` (usando o `createAuth` de teste): com 2 membros no grátis, **aceitar** um convite falha com o código `ORGANIZATION_MEMBERSHIP_LIMIT_REACHED`; **criar convite** acima de `2 − membros − pendentes` falha com `INVITATION_LIMIT_REACHED`; no Plus (até 8) funciona; membros existentes acima do limite **não** são removidos.
- [ ] **Step 2: Rodar** `cd apps/api && npx vitest run tests/api/plan-limits.test.ts tests/auth-member-limits.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** as duas funções, o `details` no `ApiError`/`route()` e as funções de limite no `organization(...)` do `auth.ts`. O `/home` valida `dia` com `assertCanViewDay` **só quando** o parâmetro existe.
- [ ] **Step 4: Rodar** os testes e a suíte da API. Expected: PASS (`api-only.test.ts` e os testes de rota existentes continuam verdes).
- [ ] **Step 5: Commit** `feat(api): limites do grátis (pacientes, pessoas e histórico) com erro 402 plan_limit`.

### Task 4: `/me` com assinatura e uso

**Files:**
- Modify: `apps/api/src/app/api/v1/me/route.ts`
- Test: `apps/api/tests/api/me-subscription.test.ts`

**Interfaces:**
- Consumes: `getSubscription` (Tarefa 2), `MeDto.subscription` (Tarefa 1).

- [ ] **Step 1: Testes (RED)**: `/me` de conta grátis traz `subscription` com `tier: "free"`, os limites e `usage` (pacientes/membros reais); com `grantPlus` traz `tier: "plus"`, `plusUntil` em ISO, `source`; a resposta **não** vaza dados de outras contas.
- [ ] **Step 2: Rodar** `npx vitest run tests/api/me-subscription.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** (uma chamada a `getSubscription(db, ctx.orgId, new Date())`).
- [ ] **Step 4: Rodar** a suíte. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): /me devolve a assinatura da conta`.

### Task 5: Webhook do RevenueCat e sincronização

**Files:**
- Create: `apps/api/src/app/api/webhooks/revenuecat/route.ts`, `apps/api/src/app/api/v1/subscription/sync/route.ts`, `apps/api/src/lib/services/revenuecat.ts`
- Modify: `apps/api/src/lib/services/subscription.ts` (`applyRevenueCatEvent`), `apps/api/.env.example` (se existir) / docs
- Test: `apps/api/tests/services/revenuecat.test.ts`, `apps/api/tests/api/revenuecat-webhook.test.ts`

**Interfaces:**
- Produces: `applyRevenueCatEvent(db: Db, event: RevenueCatEvent, now: Date): Promise<"applied" | "ignored">` com `type RevenueCatEvent = { id: string; type: string; app_user_id: string; product_id?: string; expiration_at_ms?: number | null; event_timestamp_ms: number; store?: "APP_STORE" | "PLAY_STORE" | string; environment?: "SANDBOX" | "PRODUCTION"; period_type?: string }`; `POST /api/webhooks/revenuecat` (cabeçalho `Authorization` = `REVENUECAT_WEBHOOK_SECRET`; corpo `{ api_version, event }`); `POST /api/v1/subscription/sync` (usuário logado, dono/admin; consulta a API REST do RevenueCat com `REVENUECAT_SECRET_API_KEY` para `GET /v1/subscribers/{orgId}` e aplica a validade do entitlement `plus`; usado logo depois da compra, antes de o webhook chegar). `fetchSubscriber` isolado em `revenuecat.ts` (injetável nos testes).
- Regras de `applyRevenueCatEvent`: eventos que **concedem** (`INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE`, `UNCANCELLATION`, `NON_RENEWING_PURCHASE`, `SUBSCRIPTION_EXTENDED`, `REFUND_REVERSED`) → `grantPlus(until = expiration_at_ms)`, `source` = `apple` (APP_STORE/MAC_APP_STORE) ou `google` (PLAY_STORE), `willRenew = true`; `CANCELLATION` → `will_renew = false`, **mantém a validade** (exceto reembolso: expiração já no passado); `EXPIRATION` → `plus_until = min(atual, agora)`; `BILLING_ISSUE`, `TRANSFER`, `TEST`, demais → ignorados (200). Ignora `app_user_id` que **não** é uma organização existente. **Idempotência/ordem:** ignora se `event_timestamp_ms <= last_event_ms` da conta.

- [ ] **Step 1: Testes (RED)** do serviço, com um evento de fixture por tipo (formato da documentação do RevenueCat): `INITIAL_PURCHASE` com `period_type: "TRIAL"` concede até a expiração; `RENEWAL` estende; `CANCELLATION` mantém o Plus até a validade e marca `will_renew=false`; `EXPIRATION` volta ao grátis; **mesmo evento duas vezes** = uma aplicação; evento **mais antigo** que o último não regride; `app_user_id` anônimo (`$RCAnonymousID:abc`) ou organização inexistente → `ignored`; `TEST` → `ignored`; ambiente `SANDBOX` é aceito (testadores e revisão da Apple). Testes de rota: sem `Authorization` ou com valor errado → **401** e nada muda; com o segredo → 200 e o `/me` da conta passa a `plus`; corpo inválido → 400; resposta **sempre 200** para evento ignorado (o RevenueCat reenvia em erro). `sync`: sem login → 401; membro comum → 403; dono/admin → aplica o resultado do `fetchSubscriber` simulado (com e sem entitlement ativo).
- [ ] **Step 2: Rodar** `npx vitest run tests/services/revenuecat.test.ts tests/api/revenuecat-webhook.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** o serviço, as duas rotas (o webhook fica fora de `/api/v1` e **sem** sessão, só com o segredo, comparado em tempo constante) e a leitura segura do corpo. Os nomes dos campos seguem a documentação do RevenueCat (conferir o payload real no painel na Tarefa 11 com o evento `TEST`).
- [ ] **Step 4: Rodar** os testes e a suíte da API. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): webhook do RevenueCat e sincronização da assinatura`.

### Task 6: Conceder Plus manualmente (testadores e fundadores)

**Files:**
- Create: `apps/api/scripts/grant-plus.cli.ts`
- Modify: `apps/api/package.json` (script `grant-plus`)
- Test: `apps/api/tests/services/grant-plus-cli.test.ts`

**Interfaces:**
- Produces: `parseGrantArgs(argv: string[]): { email: string; until: Date }` e `grantPlusByEmail(db: Db, email: string, until: Date): Promise<{ orgId: string }>` (resolve a **organização ativa** do usuário pelo e-mail e chama `grantPlus(..., "manual")`); CLI: `npm run grant-plus -- --email a@b.com --until 2027-12-31`.

- [ ] **Step 1: Testes (RED)**: argumentos válidos (`--email`, `--until` no formato `AAAA-MM-DD`); sem `--email` ou `--until`, data inválida ou no passado → erro claro; e-mail inexistente → erro; usuário com conta → concede `source: "manual"` até o fim do dia informado (America/Sao_Paulo) e `getSubscription` devolve `plus`; reaplicar não duplica.
- [ ] **Step 2: Rodar** `npx vitest run tests/services/grant-plus-cli.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** (a CLI usa `getDb()` com `DATABASE_URL`, como os outros scripts, e imprime o `orgId` e a validade).
- [ ] **Step 4: Rodar** a suíte. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): script para conceder Plus manualmente`.

### Task 7: Exclusão de conta e aviso da assinatura

**Files:**
- Modify: `apps/app/src/components/delete-account.tsx`
- Test: `apps/api/tests/services/account-deletion.test.ts` (acrescentar), `apps/app/tests/delete-account.test.tsx` (acrescentar)

- [ ] **Step 1: Testes (RED)**: ao excluir a **única** pessoa de uma conta com assinatura, a linha de `org_subscriptions` **some junto** (cascata, sem erro); excluir um membro de conta com mais gente **não** mexe na assinatura. No app: a tela de exclusão mostra o aviso **"Se você assina o Medicron Plus, cancele também na App Store ou no Google Play: excluir a conta não cancela a cobrança da loja."**
- [ ] **Step 2: Rodar** os dois testes. Expected: FAIL (o segundo; o primeiro pode já passar pela cascata, e então vira teste de regressão).
- [ ] **Step 3: Implementar** o aviso (texto exato acima) no cartão de exclusão.
- [ ] **Step 4: Rodar** as suítes. Expected: PASS.
- [ ] **Step 5: Commit** `feat: aviso de assinatura ao excluir a conta; teste de cascata`.

### Task 8: App, camada de compras (RevenueCat)

**Files:**
- Create: `apps/app/src/lib/purchases.ts` (nativo), `apps/app/src/lib/purchases.web.ts`, `apps/app/src/lib/subscription-queries.ts`
- Modify: `apps/app/package.json` (`react-native-purchases`), `apps/app/eas.json` (variáveis `EXPO_PUBLIC_REVENUECAT_*` por perfil, valores em branco com comentário), `apps/app/src/lib/api/me.ts` e o provedor de sessão/organização (ligar `logIn`/`logOut`)
- Test: `apps/app/tests/purchases.test.ts`, `apps/app/tests/subscription-queries.test.tsx`

**Interfaces:**
- Produces: `configurePurchases(orgId: string | null): Promise<void>` (configura o SDK uma vez; `logIn(orgId)` quando há conta ativa, `logOut` ao sair ou trocar); `getOffer(): Promise<Offer | null>` com `type Offer = { monthly: Pkg; annual: Pkg }` e `type Pkg = { id: string; priceString: string; period: "month" | "year"; trial: { days: number } | null }` (o `trial` vem de `introPrice` da loja; **nenhum preço no código**); `purchase(pkg: Pkg): Promise<"purchased" | "cancelled">` (erros de verdade sobem); `restore(): Promise<boolean>`; `manageUrl(): string` (iOS `https://apps.apple.com/account/subscriptions`; Android `https://play.google.com/store/account/subscriptions`); `purchasesAvailable: boolean` (`false` na web). `useSubscription()`: dados do `/me` (`subscription`), `refresh()` que chama `POST /subscription/sync` e invalida o `/me`; `afterPurchase()`: sync + **polling curto** do `/me` (até ~20 s, 2 s entre tentativas) até virar `plus`.
- Consumes: `MeDto.subscription` (Tarefa 1), `POST /api/v1/subscription/sync` (Tarefa 5).

- [ ] **Step 1: Testes (RED)** (com `react-native-purchases` mockado em `jest.mock`): `configurePurchases("org1")` chama `configure` com a chave da plataforma e `logIn("org1")`; chamar de novo com a mesma conta não reconfigura; `configurePurchases(null)` → `logOut`; sem chave (variável vazia) → **não quebra** e `purchasesAvailable` fica `false`; `getOffer()` mapeia pacotes mensal/anual, `priceString` da loja e `trial.days = 7` quando o anual tem oferta introdutória gratuita de 7 dias, `null` quando não tem; `purchase` devolve `"cancelled"` quando o usuário cancela (`userCancelled`) e **lança** nos demais erros; `restore()` verdadeiro se o entitlement `plus` está ativo; na web `purchasesAvailable === false` e `getOffer()` → `null`; `afterPurchase()` chama o sync e para de repetir assim que o `/me` vem `plus` (timers falsos), e desiste sem erro após o tempo.
- [ ] **Step 2: Rodar** `cd apps/app && npx jest tests/purchases.test.ts tests/subscription-queries.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar.** `npx expo install react-native-purchases`; nada de `react-native-purchases-ui` (o paywall é nosso). Ligar `configurePurchases` onde a organização ativa é conhecida (efeito no provedor autenticado) e no **sair da conta** (`logOut`). Arquivo `.web.ts` com a mesma API e valores neutros.
- [ ] **Step 4: Rodar** a suíte do app e o `tsc`. Expected: PASS. Conferir que o `expo export -p web` não importa o módulo nativo (o export web da CI/Vercel não pode quebrar).
- [ ] **Step 5: Commit** `feat(app): camada de compras (RevenueCat) e leitura da assinatura`.

### Task 9: App, paywall, limites e cartão do Plus

**Files:**
- Create: `apps/app/src/app/(app)/plus.tsx`, `apps/app/src/components/plus-card.tsx`, `apps/app/src/lib/plan-limit.ts`
- Modify: `apps/app/src/app/(app)/conta.tsx`, `apps/app/src/components/patient-form.tsx` (ou o ponto de criação), `apps/app/src/components/invite-form.tsx`, a tela Hoje (navegação de dia), `apps/app/src/lib/api/errors.ts`
- Test: `apps/app/tests/plus-screen.test.tsx`, `apps/app/tests/plan-limit.test.ts`, `apps/app/tests/plus-card.test.tsx`, e acréscimos nos testes das telas tocadas

**Interfaces:**
- Produces: `isPlanLimit(error: unknown): null | { limit: "patients" | "members" | "history" }` (reconhece o 402 `plan_limit` da API **e** os códigos do `better-auth` `ORGANIZATION_MEMBERSHIP_LIMIT_REACHED` e `INVITATION_LIMIT_REACHED`, que viram `members`); rota `/plus?motivo=patients|members|history`; `PlusCard` (na Conta): estado (Grátis / Plus até DD/MM / renova ou termina), uso "1 de 2 pacientes", "2 de 2 pessoas", botão "Conhecer o Plus" ou "Gerenciar assinatura" (abre `manageUrl()`).
- Conteúdo da tela `/plus`: título "Medicron Plus"; o que o Plus inclui (**pacientes ilimitados, até 8 pessoas, histórico completo**) e o que **continua grátis** (lembretes, Hoje, marcar doses, widgets); os dois planos com `priceString` da loja, o anual com destaque, "equivale a R$ X/mês" **somente se calculável pelo SDK** (sem número fixo); **texto da oferta de 7 dias exatamente como as regras da Apple pedem**: "7 dias grátis, depois {preço}/ano. Cancele quando quiser nos Ajustes da App Store." e a data da cobrança; botão principal, **Restaurar compras**, links **Termos de uso** (`/termos`) e **Política de privacidade**; estados: carregando, erro com "Tentar de novo", já é Plus (mostra validade e "Gerenciar"), **web** ("Assine pelo aplicativo no celular"), **membro comum** ("Peça a quem administra a conta para assinar").

- [ ] **Step 1: Testes (RED)**: `isPlanLimit` reconhece o 402 e os dois códigos do `better-auth`, e devolve `null` para outros erros; criar o **3º paciente** no grátis (API responde 402) **abre `/plus?motivo=patients`** em vez de mostrar erro; convidar/gerar link acima do limite abre `/plus?motivo=members`; escolher um dia **com mais de 30 dias** em Hoje (402) abre `/plus?motivo=history` e **a tela Hoje continua usável**; a tela `/plus`: mostra os preços da loja (do mock), o texto da oferta de 7 dias **só quando `trial` existe**, o anual em destaque, o botão de comprar chama `purchase` e depois `afterPurchase`; "Restaurar compras" chama `restore`; compra cancelada **não** mostra erro; erro real mostra mensagem e "Tentar de novo"; na web mostra a orientação e **nenhum** botão de compra; membro comum **não** vê o botão de compra; já Plus mostra a validade; `PlusCard`: contagens corretas e o botão certo para cada estado; **nada na tela Hoje, em marcar dose ou nos lembretes passa por verificação de plano** (teste de regressão: `Hoje` renderiza e resolve doses com `subscription.tier = "free"` acima dos limites).
- [ ] **Step 2: Rodar** `cd apps/app && npx jest tests/plus-screen.test.tsx tests/plan-limit.test.ts tests/plus-card.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar** as telas e os desvios para `/plus`; adicionar o `PlusCard` à Conta (acima de Aparência); `isPlanLimit` em `lib/plan-limit.ts`.
- [ ] **Step 4: Rodar** a suíte completa do app, o `tsc` e o export web. Expected: PASS. Conferir visualmente a tela `/plus` (claro/escuro, 390 pt) com o servidor de demonstração (preços fictícios no mock) e anexar a captura ao ledger.
- [ ] **Step 5: Commit** `feat(app): paywall do Medicron Plus, limites com desvio ao paywall e cartão na Conta`.

### Task 10: Termos de uso e política de privacidade

**Files:**
- Create: `apps/api/src/app/termos/page.tsx`
- Modify: `apps/api/src/app/privacidade/page.tsx`, `apps/app/scripts/vercel-config.ts` (rewrite `/termos` para a API, como `/privacidade`), `apps/app/scripts/build-site.ts`/`site/index.template.html` (link "Termos" no rodapé do hotsite), `docs/lojas.md`
- Test: `apps/api/tests/termos.test.ts`, `apps/app/tests/vercel-web.test.ts` (acrescentar), `apps/app/tests/site.test.ts` (acrescentar)

- [ ] **Step 1: Testes (RED)**: `/termos` renderiza e cita: o serviço, que o Plus é uma **assinatura renovável automaticamente** cobrada pela loja, **como cancelar** (Ajustes da App Store / Google Play), **teste grátis de 7 dias** e que **o essencial é grátis**, que **não é dispositivo médico**, reembolso conforme as regras da loja, lei brasileira (CDC), contato (`CONTACT_EMAIL`, se existir); a política de privacidade ganha a seção **"Compras e assinatura"** (o RevenueCat processa os identificadores de compra; guardamos o plano e a validade da conta; não guardamos dados de cartão); `vercel.json` gerado inclui o rewrite de `/termos` para a API **antes** do fallback do app; o hotsite mostra o link "Termos de uso" no rodapé; o link aponta para `/termos`.
- [ ] **Step 2: Rodar** os testes. Expected: FAIL.
- [ ] **Step 3: Implementar** as páginas e os links (a página `/termos` fica pública, sem sessão).
- [ ] **Step 4: Rodar** as suítes e a geração do `vercel.json`. Expected: PASS.
- [ ] **Step 5: Commit** `feat: termos de uso, seção de compras na política e link no hotsite`.

### Task 11: Documentação e passos do usuário

**Files:**
- Modify: `docs/passos-do-usuario.md` (nova seção J), `docs/app-store-connect.md`, `docs/monetizacao.md` (estado), `docs/lojas.md`, memória do projeto
- Test: `apps/app/tests/app-store-connect-doc.test.ts` (continua verde; ajustar os textos se necessário)

- [ ] **Step 1: Escrever a seção J de `docs/passos-do-usuario.md`** (passo a passo para o usuário, em ordem): (1) contrato de apps pagos + CPF + banco no App Store Connect e conta Play (item de pessoa física de `docs/monetizacao.md`, seção 6.1); (2) **App Store Connect**: grupo "Medicron Plus", produtos `app.medicron.plus.monthly` e `.annual`, preços **R$ 12,90 / R$ 89,90**, **oferta introdutória gratuita de 7 dias só no anual**, nome e descrição em português, captura da tela `/plus` para a revisão; (3) **Play Console**: assinatura com os mesmos ids, planos base mensal e anual, oferta de teste gratuito de 7 dias no anual; (4) **RevenueCat**: projeto, apps iOS e Android, produtos, entitlement `plus`, offering `default` com os dois pacotes, webhook para `https://medicron.com.br/api/webhooks/revenuecat` com o valor do cabeçalho `Authorization`; (5) variáveis na Vercel (`REVENUECAT_WEBHOOK_SECRET`, `REVENUECAT_SECRET_API_KEY`) e no EAS (`EXPO_PUBLIC_REVENUECAT_IOS_KEY`, `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`); (6) **teste em sandbox** (conta de testador sandbox da Apple; evento `TEST` do painel conferindo que chega 200); (7) conceder Plus manual aos testadores (`npm run grant-plus`); (8) publicar a API **depois da semana estável** e novo build iOS/Android; (9) **teste fechado do Google** (12 pessoas, 14 dias) já com um build atual.
- [ ] **Step 2: Atualizar** `docs/app-store-connect.md`: o "App Privacy" ganha **Compras** e **ID de usuário** (funcionalidade do app, vinculados, sem rastreamento); as notas do revisor ganham a assinatura (onde achar o paywall: Conta → "Conhecer o Plus" ou ao criar o 3º paciente; sandbox; o essencial é grátis); a descrição ganha uma linha do Plus (sem preço no texto de metadados, só "assinatura opcional"); o teste do documento continua verde. Atualizar `docs/monetizacao.md` (o que foi construído) e a memória.
- [ ] **Step 3: Rodar** `cd apps/app && npx jest tests/app-store-connect-doc.test.ts` e `npx vitest run` na API e no shared. Expected: PASS.
- [ ] **Step 4: Commit** `docs: passos do usuário do Medicron Plus, App Privacy e notas de revisão`.

---

## Revisão final e encerramento

Revisão independente da branch inteira (subagente, modelo mais capaz) com o Review Focus acima; correções críticas e importantes com teste primeiro; mesclar `--no-ff` em `main` **sem publicar** (publicação da API e novo build são do usuário, Tarefa 11).
