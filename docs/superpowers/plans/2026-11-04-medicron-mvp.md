# Medicron MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App web mobile-first (PWA) para controlar horários de medicações e procedimentos de gatos, com push notifications, dashboard e contas compartilhadas por convite.

**Architecture:** Next.js (App Router) numa única aplicação na Vercel. Postgres (Neon, provisionado pelo Marketplace da Vercel) acessado por Drizzle. Autenticação e multi-conta com Better Auth (plugin `organization`: uma organização = uma "conta" com seus gatos, membros e convites), sem serviço externo além do banco. Regras de negócio ficam em `src/lib/services/*` como funções que recebem `db` (testáveis com PGlite em memória). Lembretes: Vercel Cron chama `/api/cron/dispatch` a cada minuto, que envia Web Push (`web-push`, VAPID) para os membros da organização.

**Tech Stack:** Next.js (versão estável atual, App Router, TypeScript), Tailwind + shadcn/ui, Drizzle ORM + Neon, Better Auth, `web-push`, Vitest + `@electric-sql/pglite`, Zod.

**Spec:** Sem documento separado — requisitos da conversa de 2026-11-04 (Thiago): cadastrar gatos; cadastrar medicações e procedimentos individualmente; associar paciente × item com frequência; responsivo/mobile; push web; dashboard inicial; convidar pessoas para administrar a mesma conta; multi-contas.

## Global Constraints

- Idioma da UI e das mensagens: português do Brasil, com acentuação correta.
- Fuso de exibição: `America/Sao_Paulo`. Todo instante é gravado em UTC (`timestamptz`).
- Mobile-first: layout testado em 390px de largura; alvos de toque ≥ 44px; navegação inferior fixa no mobile.
- Toda tabela de domínio tem `organization_id`; **toda** consulta/mutação filtra por ele (nunca confiar em id vindo do cliente sem filtrar pela organização ativa).
- Antes de usar APIs de Next.js, Better Auth, Drizzle e shadcn, conferir a doc instalada em `node_modules/<pkg>/docs` ou a doc oficial — não confiar em memória (Next recente usa `proxy.ts`, não `middleware.ts`).
- Sem e-mail transacional no MVP: convite = link copiável.
- Frequência = "a cada N minutos" a partir de um horário âncora (ex.: a cada 8 h começando às 08:00). Sem dias da semana no MVP.
- Segredos só em variáveis de ambiente: `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CRON_SECRET`.

## Review Focus

1. Isolamento entre contas: usuário da org A acessando id de gato/plano da org B (URL ou server action) deve receber 404/erro, nunca dados.
2. Duplo toque em "Feito" (ou dois membros marcando ao mesmo tempo): só uma dose registrada e o próximo horário avança uma única vez.
3. Convite: link usado duas vezes, expirado, cancelado ou por usuário já membro — mensagem clara, sem criar membro duplicado.
4. Subscription de push inválida (HTTP 404/410): removida do banco e o envio aos demais continua; mesmo horário nunca é notificado duas vezes se o cron rodar de novo.
5. Plano com `endAt` no passado/ultrapassado, gato arquivado ou item arquivado: nunca gera lembrete nem aparece no dashboard.

---

## File Structure

```
src/
  app/
    (auth)/entrar/page.tsx, cadastrar/page.tsx
    convite/[id]/page.tsx                 # aceitar convite
    (app)/layout.tsx                      # shell: nav inferior, seletor de conta
    (app)/page.tsx                        # dashboard
    (app)/gatos/…                         # lista, novo, [id] (detalhe + planos)
    (app)/itens/…                         # lista, novo, [id]
    (app)/conta/page.tsx                  # membros, convites, notificações
    api/auth/[...all]/route.ts            # Better Auth
    api/push/subscribe/route.ts
    api/cron/dispatch/route.ts
  lib/
    schedule.ts                           # lógica pura de horários
    auth.ts, auth-client.ts, session.ts   # Better Auth + getOrgContext
    db/index.ts, schema.ts, test-db.ts
    services/{cats,items,plans,doses,push}.ts
    push/sender.ts                        # wrapper do web-push
  components/…                            # UI (shadcn em components/ui)
public/sw.js, manifest.webmanifest, icons/
tests/…                                   # espelha src/lib
```

---

### Task 1: Scaffold, tooling e repositório

**Files:**
- Create: projeto Next.js na raiz de `/Users/thiagosciotta/Projects/medicron`, `vitest.config.ts`, `.env.example`, `README.md` (curto: como rodar)

**Interfaces:**
- Produces: scripts `npm run dev | build | test | db:generate | db:migrate`; alias `@/*` → `src/*`.

- [ ] **Step 1:** `git init`; `npx create-next-app@latest . --ts --tailwind --app --src-dir --eslint --use-npm --yes` (aceitar que a pasta contém `docs/`).
- [ ] **Step 2:** `npx shadcn@latest init` e adicionar: `button card input label select textarea dialog sheet badge tabs sonner checkbox`.
- [ ] **Step 3:** Instalar `drizzle-orm @neondatabase/serverless better-auth zod web-push` e dev `drizzle-kit vitest @electric-sql/pglite @types/web-push`; configurar `vitest.config.ts` (environment `node`, alias `@`).
- [ ] **Step 4:** Criar `tests/smoke.test.ts` com `expect(1+1).toBe(2)`; rodar `npx vitest run` → PASS.
- [ ] **Step 5:** `npm run build` → sucesso. Commit `chore: scaffold next app`.

### Task 2: Lógica pura de horários (`src/lib/schedule.ts`)

**Files:**
- Create: `src/lib/schedule.ts`
- Test: `tests/schedule.test.ts`

**Interfaces:**
- Produces:
  - `nextSlotAfter(anchor: Date, intervalMinutes: number, after: Date): Date` — primeiro instante `anchor + k*interval` (k ≥ 0) **estritamente maior** que `after`.
  - `firstDueAt(anchor: Date, intervalMinutes: number, now: Date): Date` — `anchor` se ainda no futuro ou igual a `now`, senão o slot em curso mais próximo no futuro (`nextSlotAfter(anchor, interval, now)`).
  - `isPlanLive(p: { active: boolean; endAt: Date | null }, slot: Date): boolean` — `active` e (`endAt` nulo ou `slot <= endAt`).
  - `INTERVAL_PRESETS: {label: string; minutes: number}[]` — 4 h, 6 h, 8 h, 12 h, 24 h, 48 h, 72 h, 7 dias.

- [ ] **Step 1: testes** — `nextSlotAfter(08:00, 480, 08:00)` = 16:00; com `after` = 07:00 → 08:00 (âncora); com `after` = 3 dias depois às 10:00 → próximo múltiplo (16:00); `intervalMinutes <= 0` lança `RangeError`; `isPlanLive` falso quando `active=false` ou `slot > endAt`, verdadeiro quando `slot == endAt`.
- [ ] **Step 2:** rodar → FAIL (módulo inexistente).
- [ ] **Step 3:** implementar com aritmética em ms (sem loops).
- [ ] **Step 4:** rodar → PASS. Commit `feat: schedule math`.

### Task 3: Schema do banco, migrações e DB de teste

**Files:**
- Create: `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `src/lib/db/test-db.ts`, `drizzle.config.ts`
- Test: `tests/db.test.ts`

**Interfaces:**
- Produces (Drizzle, todas com `id text pk` via `crypto.randomUUID()`, `createdAt timestamptz default now()`):
  - `cats`: `organizationId`, `name`, `birthDate date null`, `weightKg numeric null`, `notes text null`, `archivedAt timestamptz null`.
  - `items`: `organizationId`, `name`, `kind` enum `'medication'|'procedure'`, `defaultDose text null` (ex.: "1 comprimido", "limpar com soro"), `notes null`, `archivedAt null`.
  - `carePlans`: `organizationId`, `catId → cats`, `itemId → items`, `dose text null`, `intervalMinutes int`, `anchorAt timestamptz`, `endAt timestamptz null`, `active bool default true`, `nextDueAt timestamptz`, `notifiedForDueAt timestamptz null`.
  - `doseLogs`: `organizationId`, `carePlanId`, `scheduledFor timestamptz`, `outcome` enum `'done'|'skipped'`, `doneByUserId text`, `doneAt timestamptz`, `value text null` (ex.: "38,7 °C"), `note text null`; **unique** `(carePlanId, scheduledFor)`.
  - `pushSubscriptions`: `userId`, `endpoint text unique`, `p256dh`, `auth`.
  - Tabelas do Better Auth (user/session/account/verification/organization/member/invitation) entram no Task 4 via `npx @better-auth/cli generate`, no mesmo `schema.ts`.
  - `export type Db`; `createTestDb(): Promise<Db>` (PGlite + migrações aplicadas); `db` (Neon, `drizzle-orm/neon-http`) em `index.ts`.

- [ ] **Step 1: teste** `tests/db.test.ts`: `createTestDb()` e inserir gato + item + plano + log; segundo log com mesmo `(carePlanId, scheduledFor)` → lança erro de unique.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** escrever schema, `drizzle.config.ts`, `npm run db:generate`; `createTestDb` aplica a pasta `drizzle/` com o migrator do PGlite.
- [ ] **Step 4:** rodar → PASS. Commit `feat: database schema`.

### Task 4: Autenticação, organizações e guarda de tenant

**Files:**
- Create: `src/lib/auth.ts`, `src/lib/auth-client.ts`, `src/lib/session.ts`, `src/app/api/auth/[...all]/route.ts`, `src/proxy.ts`, `src/app/(auth)/entrar/page.tsx`, `src/app/(auth)/cadastrar/page.tsx`, `src/app/(app)/layout.tsx`
- Modify: `src/lib/db/schema.ts` (tabelas Better Auth)
- Test: `tests/session.test.ts`

**Interfaces:**
- Produces:
  - `auth` (Better Auth: e-mail+senha, `drizzleAdapter`, plugin `organization` com `allowUserToCreateOrganization: true`, convites com expiração de 7 dias).
  - `getOrgContext(): Promise<{ userId: string; orgId: string; role: 'owner'|'admin'|'member' }>` — lê a sessão; se não logado → `redirect('/entrar')`; se sem org ativa → ativa a primeira org do usuário; se não tem nenhuma → `redirect('/conta/nova')`.
  - `assertMember(db: Db, userId: string, orgId: string): Promise<void>` — lança `Forbidden` se `member` inexistente (usada por `getOrgContext` e testável).
- Fluxo de cadastro: ao criar usuário, criar organização "Casa de <nome>" e ativá-la (hook `databaseHooks.user.create.after` ou passo explícito na action de cadastro). Seletor de conta no header do layout permite trocar de organização e criar nova.

- [ ] **Step 1: teste** `assertMember`: membro passa; usuário de outra org lança `Forbidden`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar; gerar schema Better Auth e migração. **Step 4:** PASS.
- [ ] **Step 5:** páginas de entrar/cadastrar (formulário simples, mensagens em PT-BR); `proxy.ts` redireciona rotas `(app)` sem cookie de sessão para `/entrar`.
- [ ] **Step 6:** verificação manual: cadastrar usuário → cai no dashboard vazio com a org criada. Commit `feat: auth and organizations`.

### Task 5: Convites e gestão da conta

**Files:**
- Create: `src/app/(app)/conta/page.tsx`, `src/app/convite/[id]/page.tsx`, `src/components/invite-form.tsx`
- Test: `tests/invites.test.ts`

**Interfaces:**
- Consumes: `auth.api.createInvitation / acceptInvitation / cancelInvitation / listInvitations` do plugin `organization` (conferir nomes na doc instalada).
- Produces: `inviteLink(invitationId: string, baseUrl: string): string` → `${baseUrl}/convite/${id}` (em `src/lib/invites.ts`); `/conta` lista membros, convites pendentes (com botão "Copiar link" e "Cancelar") e formulário de e-mail + papel (admin/member). Só `owner|admin` convidam.
- `/convite/[id]`: se deslogado, redireciona para `/cadastrar?next=/convite/<id>` (e `/entrar` análogo); logado → botão "Entrar na conta X" que aceita e vai ao dashboard.

- [ ] **Step 1: teste** `inviteLink('abc','https://x.app')` = `https://x.app/convite/abc`.
- [ ] **Step 2–4:** red/green. **Step 5:** UI. Cobrir manualmente (Review Focus 3): usar o link duas vezes, cancelar e abrir, convite para quem já é membro.
- [ ] **Step 6:** Commit `feat: invitations`.

### Task 6: Gatos (CRUD)

**Files:**
- Create: `src/lib/services/cats.ts`, `src/app/(app)/gatos/page.tsx`, `gatos/novo/page.tsx`, `gatos/[id]/page.tsx`, `src/components/cat-form.tsx`
- Test: `tests/services/cats.test.ts`

**Interfaces:**
- Produces:
  - `createCat(db: Db, orgId: string, input: { name: string; birthDate?: string; weightKg?: number; notes?: string }): Promise<Cat>` (Zod: `name` 1–60)
  - `listCats(db: Db, orgId: string): Promise<Cat[]>` (exclui arquivados, ordem por nome)
  - `getCat(db: Db, orgId: string, id: string): Promise<Cat | null>` (null se de outra org)
  - `updateCat(db, orgId, id, input): Promise<Cat | null>`; `archiveCat(db, orgId, id): Promise<void>` (também desativa os planos do gato)

- [ ] **Step 1: testes** — criar/listar por org; `getCat` com orgId errado → `null`; `archiveCat` remove da lista e põe `active=false` nos planos; nome vazio → erro de validação.
- [ ] **Step 2–4:** red/green. **Step 5:** páginas com Server Actions chamando `getOrgContext()`; lista em cards grandes; `notFound()` se `getCat` devolver null. **Step 6:** Commit `feat: cats`.

### Task 7: Itens — medicações e procedimentos (CRUD)

**Files:**
- Create: `src/lib/services/items.ts`, `src/app/(app)/itens/page.tsx`, `itens/novo/page.tsx`, `itens/[id]/page.tsx`, `src/components/item-form.tsx`
- Test: `tests/services/items.test.ts`

**Interfaces:**
- Produces: `createItem(db, orgId, input: { name: string; kind: 'medication'|'procedure'; defaultDose?: string; notes?: string }): Promise<Item>`; `listItems(db, orgId, kind?: 'medication'|'procedure'): Promise<Item[]>`; `getItem`, `updateItem`, `archiveItem` (arquivar desativa planos do item) — mesma semântica de retorno `null` do Task 6.
- UI: lista com abas "Medicações" / "Procedimentos"; formulário com seletor de tipo.

- [ ] **Step 1–4:** testes espelham o Task 6 (isolamento por org, filtro por `kind`, arquivar desativa planos). **Step 5:** UI. **Step 6:** Commit `feat: items`.

### Task 8: Planos de cuidado (associação gato × item + frequência)

**Files:**
- Create: `src/lib/services/plans.ts`, `src/components/plan-form.tsx`; modificar `src/app/(app)/gatos/[id]/page.tsx` (seção "Rotina" com botão "Adicionar")
- Test: `tests/services/plans.test.ts`

**Interfaces:**
- Consumes: `firstDueAt`, `INTERVAL_PRESETS` (Task 2); `getCat`, `getItem`.
- Produces:
  - `createPlan(db, orgId, input: { catId: string; itemId: string; intervalMinutes: number; anchorAt: Date; endAt?: Date; dose?: string; now?: Date }): Promise<CarePlan>` — valida que gato e item pertencem à org (senão lança `NotFound`), calcula `nextDueAt = firstDueAt(anchorAt, intervalMinutes, now)`; `dose` default = `item.defaultDose`.
  - `listPlansForCat(db, orgId, catId): Promise<(CarePlan & { item: Item })[]>`
  - `updatePlan(db, orgId, id, patch)` (recalcula `nextDueAt` se intervalo/âncora mudarem) e `deactivatePlan(db, orgId, id)`.
- UI: formulário com item (select agrupado por tipo), presets de frequência + campo "personalizada (horas)", horário da primeira dose (`<input type="datetime-local">` interpretado em America/Sao_Paulo), data final opcional, dose.

- [ ] **Step 1: testes** — cria plano e `nextDueAt` = âncora futura; âncora no passado → próximo slot futuro; gato de outra org → `NotFound`; `intervalMinutes = 0` → erro; plano com `endAt` anterior ao `nextDueAt` inicial → erro de validação.
- [ ] **Step 2–4:** red/green. **Step 5:** UI. **Step 6:** Commit `feat: care plans`.

### Task 9: Dashboard e registro de doses

**Files:**
- Create: `src/lib/services/doses.ts`, `src/components/dose-card.tsx`; modificar `src/app/(app)/page.tsx`
- Test: `tests/services/doses.test.ts`

**Interfaces:**
- Consumes: `nextSlotAfter`, `isPlanLive`.
- Produces:
  - `listAgenda(db, orgId, now: Date, horizonHours = 24): Promise<{ overdue: AgendaEntry[]; dueNow: AgendaEntry[]; upcoming: AgendaEntry[] }>` onde `AgendaEntry = { plan: CarePlan; cat: Cat; item: Item; dueAt: Date }`. `overdue`: `nextDueAt < now − 15 min`; `dueNow`: dentro de ±15 min; `upcoming`: até `now + horizon`. Só planos ativos, vivos, de gato e item não arquivados.
  - `recordDose(db, orgId, userId, input: { planId: string; scheduledFor: Date; outcome: 'done'|'skipped'; value?: string; note?: string; now?: Date }): Promise<{ recorded: boolean; nextDueAt: Date | null }>` — numa transação: só age se `plan.nextDueAt == scheduledFor` (senão `recorded:false`, sem erro); insere `doseLogs`; `nextDueAt = nextSlotAfter(anchorAt, intervalMinutes, now)`; se o novo slot não for vivo (`endAt`), `active=false` e `nextDueAt: null`. Unique `(carePlanId, scheduledFor)` garante idempotência sob concorrência (capturar violação → `recorded:false`).
  - `listRecentLogs(db, orgId, limit = 20)` para o histórico no dashboard.
- UI do dashboard: três blocos ("Atrasadas", "Agora", "Próximas 24 h"), cada cartão mostra gato, item, dose e hora; botões grandes "Feito" e "Pular"; para procedimentos com nome contendo medida (ou toda `kind='procedure'`) abrir `Sheet` com campo opcional "Valor (ex.: 38,7 °C)" e "Observação". Estado vazio amigável com atalho para "Cadastrar gato".

- [ ] **Step 1: testes** — `listAgenda` separa overdue/dueNow/upcoming e ignora plano inativo, gato arquivado e `endAt` vencido; `recordDose` avança `nextDueAt` ao próximo slot > now; segunda chamada com mesmo `scheduledFor` → `recorded:false` e exatamente 1 log; chamadas concorrentes (`Promise.all` de duas) → 1 log; última dose antes de `endAt` desativa o plano; plano de outra org → `NotFound`.
- [ ] **Step 2–4:** red/green. **Step 5:** UI + Server Action com `revalidatePath('/')` e toast "Registrado". **Step 6:** Commit `feat: dashboard and dose logging`.

### Task 10: PWA e inscrição de push

**Files:**
- Create: `public/sw.js`, `public/manifest.webmanifest`, `public/icons/icon-192.png`, `icon-512.png`, `src/app/api/push/subscribe/route.ts`, `src/components/enable-notifications.tsx`, `src/lib/services/push.ts`
- Modify: `src/app/layout.tsx` (link do manifest, `viewport` com `themeColor`, metadados apple-touch)
- Test: `tests/services/push.test.ts`

**Interfaces:**
- Produces:
  - `saveSubscription(db, userId, sub: { endpoint: string; keys: { p256dh: string; auth: string } }): Promise<void>` (upsert por `endpoint`); `removeSubscription(db, endpoint): Promise<void>`; `listSubscriptionsForOrg(db, orgId): Promise<PushSubscriptionRow[]>` (assinaturas de todos os membros da org).
  - `POST /api/push/subscribe` (exige sessão) e `DELETE` para desinscrever.
  - `sw.js`: handler `push` exibe notificação (`title`, `body`, `tag` = id do plano+horário, `data.url='/'`); `notificationclick` foca/abre `/`.
  - `<EnableNotifications/>`: botão em `/conta` e banner no dashboard; registra o SW, pede permissão, assina com `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, envia ao endpoint; no iOS orienta "Adicionar à Tela de Início" (push só funciona com o PWA instalado).
- Gerar chaves: `npx web-push generate-vapid-keys` → `.env.local` e `.env.example`.

- [ ] **Step 1: testes** — upsert não duplica o mesmo endpoint; `listSubscriptionsForOrg` só traz membros da org (usa tabelas `member` do Better Auth); `removeSubscription` apaga.
- [ ] **Step 2–4:** red/green. **Step 5:** SW, manifest, componente. **Step 6:** verificação manual no Chrome desktop: inscrever e ver a linha em `push_subscriptions`. Commit `feat: pwa and push subscription`.

### Task 11: Disparo de lembretes (cron)

**Files:**
- Create: `src/lib/push/sender.ts`, `src/lib/services/dispatch.ts`, `src/app/api/cron/dispatch/route.ts`, `vercel.ts` (ou `vercel.json`)
- Test: `tests/services/dispatch.test.ts`

**Interfaces:**
- Consumes: `listSubscriptionsForOrg`, `removeSubscription`.
- Produces:
  - `type PushSender = (sub: PushSubscriptionRow, payload: { title: string; body: string; tag: string; url: string }) => Promise<{ ok: true } | { ok: false; gone: boolean }>` — `gone` verdadeiro para HTTP 404/410.
  - `webPushSender: PushSender` (usa `web-push` com VAPID das envs).
  - `dispatchDue(db: Db, now: Date, send: PushSender): Promise<{ plans: number; sent: number; removed: number }>` — seleciona planos `active` com `nextDueAt <= now`, vivos, de gato/item não arquivados e com `notifiedForDueAt IS DISTINCT FROM nextDueAt`; **primeiro** marca `notifiedForDueAt = nextDueAt` (update condicional que retorna as linhas efetivamente reivindicadas, evitando envio duplo em execuções concorrentes) e depois envia a todos os membros da org; corpo: `"<Gato> — <Item> (<dose>)"`; `gone` remove a subscription; falha de um envio não interrompe os demais.
  - `GET /api/cron/dispatch`: exige `Authorization: Bearer ${CRON_SECRET}` (senão 401); responde o JSON do resumo.
  - Cron em `vercel.ts`: `crons: [{ path: '/api/cron/dispatch', schedule: '* * * * *' }]`. **Nota:** cron a cada minuto exige plano Pro; no Hobby só diário — nesse caso apontar um agendador externo gratuito (ex.: cron-job.org, a cada minuto) para a mesma URL com o header Bearer.

- [ ] **Step 1: testes** com sender falso — plano vencido envia 1× por membro com subscription; rodar `dispatchDue` de novo com o mesmo `now` → 0 envios; após `recordDose` (novo `nextDueAt`) e `now` além dele → envia de novo; sender devolvendo `gone` remove a subscription e continua com a próxima; plano inativo/gato arquivado/`endAt` vencido → não envia; `Promise.all([dispatchDue, dispatchDue])` → total de envios por subscription = 1.
- [ ] **Step 2–4:** red/green. **Step 5:** rota + `vercel.ts` (instalar `@vercel/config`). Teste da rota: sem header → 401.
- [ ] **Step 6:** Commit `feat: reminder dispatch`.

### Task 12: Polimento mobile, provisionamento e deploy

**Files:**
- Modify: layout/nav, `README.md`, `.env.example`

- [ ] **Step 1:** Navegação inferior fixa (Hoje · Gatos · Itens · Conta) com `safe-area-inset-bottom`; conferir em 390px e desktop; tema claro/escuro via classes do shadcn.
- [ ] **Step 2:** `npm test` (tudo PASS), `npm run build`, `npx tsc --noEmit`, `npm run lint` sem erros.
- [ ] **Step 3:** Instalar a Vercel CLI (`npm i -g vercel`), `vercel link`, provisionar Neon pelo Marketplace (`vercel integration add neon`) — define `DATABASE_URL`; `vercel env add` para `BETTER_AUTH_SECRET` (`openssl rand -base64 32`), `BETTER_AUTH_URL` (URL de produção), chaves VAPID, `VAPID_SUBJECT` (`mailto:thiagog3@gmail.com`), `CRON_SECRET`; `vercel env pull .env.local`.
- [ ] **Step 4:** Rodar migrações no Neon (`npm run db:migrate`) e `vercel deploy --prod`.
- [ ] **Step 5: verificação ponta a ponta em produção (celular):** cadastrar → criar gato e item → criar plano com primeira dose daqui a 2 min → instalar PWA → ativar notificações → receber push no horário → marcar "Feito" e ver o próximo horário; convidar um segundo usuário pelo link e confirmar que vê os mesmos gatos; criar segunda conta e confirmar que os dados não se misturam.
- [ ] **Step 6:** Commit `chore: deploy config and docs`.

---

## Self-Review (feito)

- **Cobertura:** gatos (T6), medicações/procedimentos individuais (T7), associação + frequência (T8), responsivo (T12 + restrições globais), push (T10–11), dashboard (T9), convite (T5), multi-contas (T4–5), banco no projeto (T3, T12). Sem lacunas.
- **Consistência de tipos:** `nextSlotAfter/firstDueAt/isPlanLive` (T2) usados em T8, T9; `recordDose` e `dispatchDue` compartilham `nextDueAt`/`notifiedForDueAt` definidos em T3; `PushSender` só em T11.
- **Review Focus:** 1 → T6/T7/T8/T9 (testes de isolamento); 2 → T9; 3 → T5 (manual + `inviteLink`); 4 → T11; 5 → T9/T11.
- **Decisões tomadas por autonomia:** Neon + Drizzle (SQLite não persiste na Vercel); Better Auth com plugin de organização; convite por link (sem e-mail); frequência por intervalo fixo (sem dias da semana); doses puladas não geram histórico retroativo; cron por minuto exige Pro (alternativa externa documentada).
