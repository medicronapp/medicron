# Home com visão de completude — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A home mostra, por gato, todos os cuidados esperados no dia (feito, pulado, sem registro, agora, mais tarde), uma faixa de sequência de dias em dia e permite resolver o que ficou sem registro.

**Architecture:** Nova tabela `care_slots` materializa cada horário esperado de cada rotina (gerado de forma preguiçosa e idempotente por `ensureSlots`, na leitura da home e a cada disparo do cron). Resolver um cuidado atualiza só o slot daquele horário e não mexe na rotina. O estado do dia e a sequência são **calculados** dos slots por funções puras (`completeness.ts`); nada de "dia fechado" é gravado. O disparo de lembretes passa a notificar slots não resolvidos (`notified_at`), com o mesmo comportamento observável de hoje.

**Tech Stack:** Next.js 16, Drizzle + Neon Postgres, Vitest (serviços contra PGlite, UI com jsdom), shadcn/ui (`base-nova`), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-11-04-home-completeness-design.md` (aprovado pelo dono em 2026-11-05). O usuário aprovou plano e execução; método: nativo.

## Global Constraints

- Interface e mensagens em português do Brasil, com acentuação correta. Dia, horários e semana em `America/Sao_Paulo` (UTC-3 fixo, sem horário de verão); instantes em UTC no banco.
- **Pulado conta como em dia.** Só quebra a sequência: cuidado sem registro e sem solução.
- **Janela de solução:** até 23:59:59.999 (Brasília) do dia seguinte ao do cuidado. Resolver dentro da janela conserta o dia; fora dela o registro entra, mas o dia continua "perdido" e a sequência não volta.
- **Sem registro adiantado:** só se resolve cuidado cujo horário ≤ agora + 15 min. "Agora" = dentro de ±15 min; "sem registro" = horário passou há mais de 15 min.
- Feito/Pular registra **só aquele horário**; nunca altera a rotina nem outros horários.
- Status sempre com ícone + texto, nunca só cor; alvos de toque ≥ 44 px; claro/escuro; sem texto em inglês.
- Toda consulta filtra por `organization_id`. Next 16: `params`/`searchParams` são `Promise`; conferir `node_modules/next/dist/docs` em caso de dúvida (AGENTS.md).
- Não mudar: o comportamento dos lembretes percebido pelo usuário, o contrato dos formulários de rotina, nem os dados reais já em produção (2 pessoas usam o app).
- Testes existentes continuam verdes, **exceto** `tests/services/doses.test.ts` e os casos de `tests/services/dispatch.test.ts` cuja semântica muda (substituídos nas tarefas 5 e 6).

## Review Focus

1. **Virada do dia em Brasília:** cuidado às 23:30 BRT (02:30Z do dia seguinte) e 00:30 BRT (03:30Z) caem no dia certo (testes de `dayKey`/`dayBounds` na T1 e de `dayStatus` na T2).
2. **Duplo toque / dois membros / cron e home gerando slots ao mesmo tempo:** uma única resolução, uma única linha por (rotina, horário) (T4 e T5).
3. **Borda da janela:** resolver às 23:59:59.999 do dia seguinte conserta; 00:00:00.000 do outro dia não (T2 e T5).
4. **Fantasmas:** rotina nova com âncora no passado, rotina editada no meio do dia, rotina encerrada ou de gato arquivado não geram "sem registro" indevido nem bloqueiam o fechamento do dia (T4 e T5).
5. **Quem fica dias sem abrir o app / muitas pendências / dias sem cuidado:** atenção mostra 5 + "Ver todas (N)"; dia sem cuidados não quebra nem soma sequência; rotina semanal não gera dias vazios falsos (T2 e T5).

---

## File Structure

```
src/lib/db/schema.ts                 # + careSlots; care_plans.starts_at / slots_through
drizzle/0002_*.sql                   # tabela + colunas + dados (starts_at das rotinas existentes)
src/lib/schedule.ts                  # + slotsBetween
src/lib/time.ts                      # + dayKey, dayBounds, addDays, windowEnd, weekKeys, weekdayShort
src/lib/completeness.ts              # puro: dayStatus, computeStreak
src/lib/services/slots.ts            # ensureSlots, resolveSlot, TooEarly
src/lib/services/home.ts             # getHome (modelo de leitura da home)
src/lib/services/plans.ts            # startsAt na criação; congelamento ao editar
src/lib/services/dispatch.ts         # lembretes sobre slots
src/components/home/{streak-card,attention-list,day-timeline,resolve-buttons}.tsx
src/components/dose-card.tsx         # passa a usar resolve-buttons
src/app/(app)/page.tsx, actions.ts   # montagem; ação resolve slot
```

---

### Task 1: Dia e grade de horários (funções puras)

**Files:**
- Modify: `src/lib/time.ts`, `src/lib/schedule.ts`
- Test: `tests/time.test.ts`, `tests/schedule.test.ts` (acrescentar)

**Interfaces:**
- Produces em `time.ts`: `dayKey(date: Date): string` (`"YYYY-MM-DD"` em Brasília); `dayBounds(key: string): { start: Date; end: Date }` (`start` = 00:00:00.000-03:00, `end` = 23:59:59.999-03:00); `addDays(key: string, n: number): string`; `windowEnd(key: string): Date` (= `dayBounds(addDays(key, 1)).end`); `weekKeys(todayKey: string): string[]` (segunda a domingo da semana de `todayKey`); `weekdayShort(key: string): string` (`"seg"`, `"ter"`, `"qua"`, `"qui"`, `"sex"`, `"sáb"`, `"dom"`).
- Produces em `schedule.ts`: `slotsBetween(anchor: Date, intervalMinutes: number, from: Date, to: Date, limit = 1000): Date[]` — horários `anchor + k*intervalo` (k ≥ 0) com `from ≤ t ≤ to`, crescentes, no máximo `limit`; `[]` se `from > to`; `RangeError` se `intervalMinutes ≤ 0`.

- [ ] **Step 1: Testes** — `dayKey(new Date("2026-11-05T02:59:59Z"))` = `"2026-11-04"` e `dayKey(new Date("2026-11-05T03:00:00Z"))` = `"2026-11-05"`; `dayBounds("2026-11-04")` = `{ start: 2026-11-04T03:00:00.000Z, end: 2026-11-05T02:59:59.999Z }`; `addDays("2026-11-30", 1)` = `"2026-12-01"`, `addDays("2026-03-01", -1)` = `"2026-02-28"`; `windowEnd("2026-11-04")` = `2026-11-06T02:59:59.999Z`; `weekKeys("2026-11-04")` (quarta) = de `"2026-11-02"` a `"2026-11-08"`; `weekKeys("2026-11-08")` (domingo) começa em `"2026-11-02"`; `weekdayShort("2026-11-04")` = `"qua"`. `slotsBetween` com âncora 11:00Z, 360 min: de 11:00Z a 23:00Z → `[11:00, 17:00, 23:00]`; `from` entre slots começa no próximo; `from` antes da âncora começa na âncora; `to` exato incluído; `limit` corta; `from > to` → `[]`.
- [ ] **Step 2:** `npx vitest run tests/time.test.ts tests/schedule.test.ts` → FAIL (funções inexistentes).
- [ ] **Step 3:** Implementar. `dayKey`: deslocar -3 h e usar `toISOString().slice(0,10)`; `addDays` e `weekKeys` por aritmética em UTC meio-dia para evitar virada; `slotsBetween` com `k0 = max(0, ceil((from - anchor) / step))` sem laço de busca.
- [ ] **Step 4:** Rodar → PASS. **Step 5:** `git commit -m "feat: dia em Brasília e grade de horários"`.

### Task 2: Estado do dia e sequência (funções puras)

**Files:**
- Create: `src/lib/completeness.ts`
- Test: `tests/completeness.test.ts`

**Interfaces:**
- Consumes: `dayKey`, `windowEnd`, `addDays` (T1).
- Produces:
  - `type SlotFacts = { scheduledFor: Date; outcome: "done" | "skipped" | null; resolvedAt: Date | null }`
  - `type DayStatus = "empty" | "ok" | "open" | "pending" | "lost"`
  - `dayStatus(slots: SlotFacts[], key: string, now: Date): DayStatus` — sem cuidados → `empty`; algum não resolvido com `now > windowEnd(key)` **ou** resolvido com `resolvedAt > windowEnd(key)` → `lost`; todos resolvidos → `ok`; senão `open` se `key` é o dia de `now`, `pending` se é dia anterior (ainda na janela).
  - `type Streak = { days: number; atRisk: boolean; pendingKeys: string[] }`
  - `computeStreak(statuses: Map<string, DayStatus>, todayKey: string, earliestKey: string): Streak` — percorre de `todayKey` até `earliestKey`: `ok` soma 1; `empty` e (hoje) `open` são ignorados; dia anterior `pending` é ignorado mas marca `atRisk` e entra em `pendingKeys`; `lost` encerra a contagem. Chave ausente do mapa = `empty`.

- [ ] **Step 1: Testes** (datas em UTC com Brasília = -3 h) — `dayStatus`: vazio → `empty`; tudo resolvido dentro da janela → `ok`; pulado conta como resolvido (`ok`); um não resolvido hoje → `open`; ontem com um não resolvido às 10:00 de hoje → `pending`; ontem não resolvido com `now` = `2026-11-06T03:00:00Z` para o dia `2026-11-04` → `lost`; resolvido às `windowEnd` exato (`2026-11-06T02:59:59.999Z`) → `ok`; resolvido 1 ms depois → `lost`. `computeStreak` (hoje = 2026-11-04): [03 ok, 02 ok, 01 ok] + hoje `open` → `{ days: 3, atRisk: false }`; hoje `ok` → 4; dia 03 `lost`, 02 `ok` → `days: 1` se hoje `ok`, senão 0 (para na perda); dia 03 `pending`, 02 ok, 01 ok → `{ days: 2, atRisk: true, pendingKeys: ["2026-11-03"] }`; dias `empty` no meio não quebram nem somam; para em `earliestKey`; mapa vazio → `days: 0`.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar → PASS. **Step 5:** commit `feat: estado do dia e sequência`.

### Task 3: Schema e migração

**Files:**
- Modify: `src/lib/db/schema.ts`; Create: `drizzle/0002_*.sql` (gerada, depois editada à mão); Test: `tests/db.test.ts`

**Interfaces:**
- Produces `careSlots` (`id` uuid texto como as demais): `organizationId text not null`, `carePlanId text not null → care_plans`, `scheduledFor timestamptz not null`, `outcome dose_outcome null`, `resolvedByUserId text null`, `resolvedAt timestamptz null`, `value text null`, `note text null`, `notifiedAt timestamptz null`, `createdAt`; **unique** `care_slots_plan_slot_unique (care_plan_id, scheduled_for)`; índice `(organization_id, scheduled_for)`. `type CareSlot = typeof careSlots.$inferSelect`.
- Produces em `carePlans`: `startsAt timestamptz not null default now()` (primeiro horário esperado), `slotsThrough timestamptz null` (último horário materializado). `next_due_at` e `notified_for_due_at` ficam como legado (só `createPlan`/`updatePlan` continuam escrevendo `next_due_at`).
- Migração de dados (no mesmo SQL, após criar a coluna): `UPDATE care_plans SET starts_at = GREATEST(next_due_at, (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo')) AT TIME ZONE 'America/Sao_Paulo');` — rotinas existentes passam a esperar cuidados a partir de hoje 00:00 (Brasília) ou do próximo horário pendente, o que for maior; nada do passado é reconstruído. `dose_logs` não é migrado nem alterado (histórico legado, deixa de ser escrito).

- [ ] **Step 1: Testes** em `db.test.ts`: inserir slot; segundo slot com mesmo (plano, horário) viola unique; plano inserido sem `startsAt` recebe default (não nulo); slot nasce com `outcome`, `resolvedAt` e `notifiedAt` nulos.
- [ ] **Step 2:** rodar → FAIL. **Step 3:** editar schema, `npm run db:generate`, acrescentar o `UPDATE` ao SQL gerado. **Step 4:** `npx vitest run` (suíte inteira) → PASS (migrações aplicam no PGlite, incluindo o `UPDATE`). **Step 5:** commit `feat: tabela care_slots e colunas de rotina`.

### Task 4: Geração de slots (`ensureSlots`) e ciclo de vida da rotina

**Files:**
- Create: `src/lib/services/slots.ts` (parte 1); Modify: `src/lib/services/plans.ts`
- Test: `tests/services/slots.test.ts`, `tests/services/plans.test.ts` (acrescentar)

**Interfaces:**
- Consumes: `slotsBetween` (T1), `dayKey`/`dayBounds` (T1), `careSlots`, `carePlans.startsAt/slotsThrough` (T3).
- Produces: `ensureSlots(db: Db, now: Date, orgId?: string): Promise<number>` — para cada rotina `active`, de gato e item não arquivados (todas as contas se `orgId` ausente), materializa os horários de `max(startsAt, slotsThrough + 1 ms)` até `min(fim do dia de now em Brasília, endAt)`, `limit` 1000 por rotina, `onConflictDoNothing`, e avança `slotsThrough` (nunca para trás). Devolve quantos slots foram inseridos.
- `createPlan` passa a gravar `startsAt = nextDueAt` (primeiro horário futuro, como hoje).
- `updatePlan`: se intervalo ou âncora mudam, **antes** de alterar chama `ensureSlots(db, now, orgId)`; depois apaga os slots **não resolvidos** da rotina com `scheduledFor > now`, define `startsAt = firstDueAt(novaÂncora, novoIntervalo, now)` e `slotsThrough = max(scheduledFor)` dos slots restantes (ou `null`).

- [ ] **Step 1: Testes** (exemplo 1 da spec: Amoxicilina a cada 6 h, âncora 08:00 BRT = 11:00Z; `now` = 20:00 BRT = 23:00Z do dia 4) — gera `[08:00, 14:00, 20:00]` BRT e **não** o das 02:00 do dia seguinte; segunda chamada insere 0; duas chamadas concorrentes (`Promise.all`) deixam exatamente 3 linhas; rotina criada às 15:00 BRT com âncora 08:00 não gera 08:00 nem 14:00, só 20:00 em diante (exemplo 5); `endAt` às 15:00 BRT limita a 08:00 e 14:00; rotina inativa, de gato arquivado ou de item arquivado não gera; rotina semanal (10080 min) cria 1 slot na semana e dias intermediários ficam sem slot; chamada em outro dia cria os slots do novo dia sem repetir os antigos; `orgId` restringe à conta. Em `plans.test`: editar o intervalo às 11:00 BRT mantém os slots passados e os resolvidos de hoje, apaga os futuros não resolvidos e passa a gerar pela nova grade (exemplo 6).
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar (um `select` das rotinas elegíveis + um `insert` em lote por rotina; `slotsThrough` com `GREATEST`). **Step 4:** rodar suíte → PASS. **Step 5:** commit `feat: geração de slots esperados`.

### Task 5: Resolver cuidado e modelo de leitura da home

**Files:**
- Modify: `src/lib/services/slots.ts` (parte 2); Create: `src/lib/services/home.ts`
- Test: `tests/services/resolve.test.ts`, `tests/services/home.test.ts`; **remover** `tests/services/doses.test.ts` na T8 junto com o código legado

**Interfaces:**
- Consumes: `ensureSlots`, `dayStatus`, `computeStreak`, `dayKey`, `dayBounds`, `windowEnd`, `weekKeys` (T1–T4); `NotFound` de `@/lib/errors`.
- Produces em `slots.ts`: `class TooEarly extends Error`; `resolveSlot(db: Db, orgId: string, userId: string, input: { planId: string; scheduledFor: Date; outcome: "done" | "skipped"; value?: string; note?: string; now?: Date }): Promise<{ recorded: boolean }>` — chama `ensureSlots(db, now, orgId)`; `NotFound` se a rotina não é da conta ou o horário não é um slot existente; `TooEarly` se `scheduledFor > now + 15 min`; `UPDATE ... WHERE outcome IS NULL` devolve `recorded: false` se já resolvido; grava `resolvedByUserId`, `resolvedAt = now`, `value`, `note`. Não toca `care_plans`.
- Produces em `home.ts`: `type SlotState = "done" | "skipped" | "missed" | "now" | "later"`; `type DayEntry = { planId: string; scheduledFor: Date; catId: string; catName: string; itemName: string; kind: "medication" | "procedure"; dose: string | null; state: SlotState; resolvedBy: string | null; resolvedAt: Date | null; late: boolean; value: string | null; note: string | null }` (`late` = resolvido depois da janela); `type CatDay = { catId: string; catName: string; entries: DayEntry[]; total: number; resolved: number; missed: number }`; `type Home = { todayKey: string; selectedKey: string; selectedStatus: DayStatus; streak: Streak; week: { key: string; status: DayStatus | "future"; isToday: boolean }[]; progress: { resolved: number; total: number }; closedToday: boolean; attention: DayEntry[]; cats: CatDay[] }`; `getHome(db: Db, orgId: string, now: Date, selectedKey?: string): Promise<Home>`.
- Regras de `getHome`: chama `ensureSlots(db, now, orgId)`; considera só slots de gato/item não arquivados e (rotina ativa **ou** slot resolvido **ou** horário ≤ agora); olha no máximo 90 dias para trás para a sequência (`earliestKey` = dia do primeiro slot visível, limitado a 90 dias); `attention` = slots não resolvidos de ontem e hoje com estado `missed` ou `now`, do mais antigo ao mais novo (o corte em 5 é da UI); `cats` = slots de `selectedKey` (padrão hoje; chave inválida ou futura → hoje), uma entrada por gato com ao menos um cuidado, ordenada por gato com `missed` mais antigo primeiro e depois nome; `closedToday` = `dayStatus` de hoje é `ok`; `progress` = resolvidos/total de hoje; `week` = `weekKeys(todayKey)` com `future` para dias depois de hoje.

- [ ] **Step 1: Testes de `resolve.test.ts`** — exemplo 2: resolver o das 14:00 (às 20:05) marca só aquele slot (`outcome`, quem, quando) e deixa 20:00 pendente e `care_plans` intacto; segunda chamada → `recorded: false` e 1 resolução; `Promise.all` de duas → uma `true` e uma `false`; horário > agora + 15 min → `TooEarly`; horário inexistente ou de outra conta → `NotFound`; resolver depois da janela grava e devolve `recorded: true`.
- [ ] **Step 2: Testes de `home.test.ts`** (exemplos da spec, `now` explícito) — 1: abas/`cats` da Izzy com 08:00 `done`, 14:00 `missed`, 20:00 `now`, `missed: 1`, `closedToday: false`, `attention` com 14:00 e 20:00 nessa ordem; 3: tudo resolvido com um `skipped` → `closedToday: true` e sequência sobe; 4: ontem com 1 sem registro → `streak.atRisk: true`, resolver às 10:00 de hoje → ontem `ok`, `atRisk: false`, sequência preservada; resolver só após `windowEnd` → ontem `lost`, sequência recomeça; 7: dois gatos, cuidado sem registro em qualquer um impede `closedToday`; 8: dia sem slots não aparece como falha nem zera; `selectedKey` de ontem devolve `cats` daquele dia; rotina encerrada com slot futuro não resolvido hoje não bloqueia o fechamento; gato arquivado some de `cats`, de `attention` e do cálculo; 12 pendências ficam todas em `attention` (o corte é da UI); dois gatos com mesmo nome mantêm entradas separadas (por `catId`).
- [ ] **Step 3:** rodar → FAIL. **Step 4:** implementar (uma consulta de slots visíveis por conta na janela necessária; agrupar em memória; `dayStatus` por dia). **Step 5:** rodar suíte → PASS. **Step 6:** commit `feat: resolver cuidado e modelo de leitura da home`.

### Task 6: Lembretes sobre slots

**Files:**
- Modify: `src/lib/services/dispatch.ts`, `tests/services/dispatch.test.ts` (trocar `recordDose` por `resolveSlot` e ajustar o setup; manter os nomes e as expectativas dos casos)
- Test: `tests/services/dispatch.test.ts`

**Interfaces:**
- Consumes: `ensureSlots` (sem `orgId`), `careSlots.notifiedAt`.
- Produces: `dispatchDue(db: Db, now: Date, send: PushSender): Promise<{ plans: number; sent: number; removed: number }>` — mesma assinatura e mesmos tipos exportados. Começa por `ensureSlots(db, now)`. Candidatos: slots não resolvidos, `notifiedAt` nulo, `scheduledFor ≤ now`, rotina ativa e gato/item não arquivados. Por rotina notifica **apenas o mais recente** e marca os mais antigos como notificados sem enviar; reivindica por `UPDATE ... WHERE notified_at IS NULL RETURNING`; falha de todos os envios devolve `notifiedAt` a nulo (nova tentativa); `gone` remove a inscrição; `tag` = `${planId}-${scheduledFor.getTime()}`; texto igual ao atual.

- [ ] **Step 1: Testes** (mantêm os casos atuais e acrescentam) — uma vez por membro e sem repetir; antes do horário nada; **dose já resolvida antes do cron rodar não notifica**; após resolver 08:00, o slot de 16:00 notifica; dose não resolvida é lembrada de novo a cada intervalo, uma vez por slot; `gone` remove e segue; falha geral permite nova tentativa; plano inativo/gato arquivado/`endAt` vencido não notificam; concorrência (`Promise.all`) envia cada inscrição uma vez; **cron parado por horas com 3 slots pendentes envia 1 notificação (o mais recente)** e não reenvia os antigos depois.
- [ ] **Step 2:** rodar → FAIL nos casos novos/ajustados. **Step 3:** implementar. **Step 4:** rodar suíte → PASS. **Step 5:** commit `feat: lembretes sobre slots`.

### Task 7: Componentes da home

**Files:**
- Create: `src/components/home/{resolve-buttons,streak-card,attention-list,day-timeline}.tsx`; Modify: `src/components/dose-card.tsx`
- Test: `tests/ui/home.test.tsx`; `tests/ui/dose-card.test.tsx` continua passando sem edição

**Interfaces:**
- Consumes: tipos `Home`, `DayEntry`, `CatDay` (T5); `recordDoseAction({ planId, scheduledFor: string, outcome, value?, note? }): Promise<{ recorded: boolean; reason?: "already" | "too-early" }>` (T8).
- Produces:
  - `ResolveButtons({ planId, scheduledFor, kind, itemName, catName, size }: { planId: string; scheduledFor: string; kind: "medication" | "procedure"; itemName: string; catName: string; size?: "default" | "lg" })` — botões "Feito" e "Pular"; procedimento abre a gaveta de valor/observação (lógica hoje dentro de `DoseCard`, extraída sem mudar comportamento nem textos). `DoseCard` passa a renderizá-lo.
  - `StreakCard({ streak, week, progress, closedToday, riskText }: ...)` — título "N dias seguidos em dia" ("1 dia em dia", zero: "Comece sua sequência: feche o dia de hoje"), progresso `resolved/total` em anel, mensagem "Dia fechado!" quando `closedToday`, aviso de risco quando `streak.atRisk` ("Ontem tem N dose(s) sem registro: resolva até hoje 23:59 para manter a sequência"), semana seg–dom como links `/?dia=YYYY-MM-DD` com `aria-label` ("quarta, em dia"), cada dia com ícone + texto curto (`✓` em dia verde, `n/m`/`•` em aberto, `!` âmbar "sem solução" para `lost`, `–` vazio, sem link nos futuros) e hoje destacado.
  - `AttentionList({ entries }: { entries: SerializedEntry[] })` — mostra as 5 primeiras (do mais antigo) como `DoseCard`s (`tone` `overdue`/`now`) e botão "Ver todas (N)" quando há mais; título "Precisa de atenção · N"; some quando vazio.
  - `DayTimeline({ cats, selectedKey, todayKey }: ...)` — abas por gato (`role="tablist"`, uma por gato; rótulo = nome + selo vermelho com o nº de sem registro ou "resolvidos/total"; selecionada inicialmente a primeira da lista já ordenada), linha do tempo com horário, ícone + texto de estado (Feito, Pulado, Sem registro, Agora, Mais tarde), item, dose, quem e quando, valor/observação, selo "registrada depois" quando `late`, e `ResolveButtons` só nos estados `missed` e `now`. Quando `selectedKey ≠ todayKey`, cabeçalho "Dia dd/mm" com link "Voltar para hoje".
  - `SerializedEntry` = `DayEntry` com datas em ISO string (props de componente cliente).

- [ ] **Step 1: Testes** (`home.test.tsx`, jsdom, `recordDoseAction` mockada) — `StreakCard`: "6 dias seguidos em dia", "1 dia em dia", mensagem zero, "Dia fechado!" só quando `closedToday`, aviso de risco, semana com 7 links (futuros sem link), dia `lost` mostra "sem solução" em texto; `AttentionList` com 7 entradas mostra 5 + "Ver todas (7)" e ao clicar mostra 7; `DayTimeline` com dois gatos tem 2 abas, a selecionada tem `aria-selected="true"`, clicar na outra troca a lista, selo "1" na aba com pendência, `ResolveButtons` só em `missed`/`now` (nenhum botão em `later`/`done`/`skipped`), "registrada depois" aparece para `late`, itens longos truncam (`truncate`).
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar. **Step 4:** rodar suíte inteira → PASS (inclui `dose-card.test.tsx` intacto). **Step 5:** commit `feat(ui): componentes da home de completude`.

### Task 8: Montagem da home, ação e limpeza do legado

**Files:**
- Modify: `src/app/(app)/page.tsx`, `src/app/(app)/actions.ts`, `src/app/(app)/gatos/[id]/page.tsx`, `src/lib/services/doses.ts` (remover), `tests/services/doses.test.ts` (remover), `src/components/dose-card.tsx` (`relative`/`timeLabel` seguem iguais)
- Test: `tests/ui/home-page.test.tsx` (leve) e a suíte inteira

**Interfaces:**
- `page.tsx` (`searchParams: Promise<{ dia?: string }>`): `getHome(getDb(), orgId, new Date(), dia)`; ordem: `PageHeader` "Hoje", `EnableNotifications compact`, `EmptyState` se não há gatos, `StreakCard`, `AttentionList`, `DayTimeline`. Sai o resumo de três blocos, "Próximas 24 horas" e "Últimos registros".
- `recordDoseAction` (mesmo nome e entrada) chama `resolveSlot`; `TooEarly` → `{ recorded: false, reason: "too-early" }`; já resolvido → `{ recorded: false, reason: "already" }`; revalida `/`. O toast de `ResolveButtons` diferencia os dois motivos ("Este cuidado ainda não está na hora." / "Este horário já tinha sido registrado por outra pessoa.").
- Em `gatos/[id]/page.tsx`, "próxima" passa a `nextSlotAfter(p.anchorAt, p.intervalMinutes, new Date())` (o campo `nextDueAt` deixou de avançar).
- Remover `listAgenda`, `recordDose`, `listRecentLogs` e seus testes; nada mais os importa.

- [ ] **Step 1: Teste** — `home-page.test.tsx` renderiza `HomeView` (extrair a composição para `src/components/home/home-view.tsx` recebendo o `Home` serializado) com `Home` fixo e confere a ordem: `StreakCard` antes de "Precisa de atenção" antes de "Linha do dia"; ausência de "Próximas 24 horas" e "Últimos registros".
- [ ] **Step 2:** rodar → FAIL. **Step 3:** implementar e remover o legado. **Step 4:** `npx tsc --noEmit`, `npm run lint`, `npx vitest run`, `npm run build` → todos verdes. **Step 5:** commit `feat: home de completude e remoção do agendamento legado`.

### Task 9: QA visual e parada antes de publicar

**Files:** nenhum arquivo de produto novo (capturas no scratchpad).

- [ ] **Step 1:** Rodar `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build` → tudo verde. O QA visual precisa do banco real (o servidor Next não roda em PGlite), então só acontece depois da migração (Step 3).
- [ ] **Step 2: PARAR e pedir confirmação ao dono** para: aplicar `drizzle/0002` ao Neon de produção (aditiva: tabela e colunas novas; `UPDATE` só de `starts_at`; `dose_logs` intocada), salvando antes uma cópia das linhas de `care_plans` e `dose_logs` no scratchpad para reversão, e depois publicar. Sem essa confirmação nada vai a produção.
- [ ] **Step 3:** Com a confirmação: snapshot das contagens; `npm run db:migrate`; QA com conta de demonstração temporária (`demo+medicron@example.com`, cadastro pelo app + dados fictícios por SQL) com os cenários: Izzy com 08:00 feito, 14:00 sem registro, 20:00 agora; gato de nome longo; ontem com 1 pendência; um dia `lost` dois dias atrás (Playwright no scratchpad; 390 e 1280 px, claro/escuro; axe sem violações `serious`/`critical`); apagar a conta de demonstração e conferir que as contagens reais ficaram iguais; `vercel deploy --prod --yes`; conferir `/entrar` 200, `/` 307, cron 401 sem header e 200 com header, e que uma chamada manual ao cron cria os slots de hoje das rotinas reais.
- [ ] **Step 4:** Revisão final independente do branch inteiro (Opus), correção dos achados Important/Critical em uma passada com teste primeiro, commit.

---

## Self-Review

- **Cobertura da spec:** faixa de sequência e semana (T2, T5, T7); atenção com 5 + "Ver todas" (T5, T7); linha do dia em abas por gato (T5, T7); pulado conta e janela de solução (T2); resolver só aquele horário e sem adiantar (T5); rotina nova/editada/encerrada sem fantasmas (T4, T5); dia do calendário em Brasília (T1); lembretes preservados (T6); migração segura (T3, T9); exemplos 1–8 mapeados em T4–T6.
- **Consistência de nomes:** `ensureSlots(db, now, orgId?)` usado em T4–T6; `resolveSlot` (T5) chamado por `recordDoseAction` (T8); `Home`/`DayEntry`/`CatDay` definidos em T5 e consumidos em T7–T8; `dayStatus`/`computeStreak` (T2) usados em `getHome` (T5).
- **Decisões minhas:** `care_slots` substitui `dose_logs` como fonte (histórico legado intocado); `next_due_at` vira legado; sem reconstrução do passado (rotinas existentes começam hoje 00:00 BRT); cálculo do estado do dia na leitura, sem gravar "dia fechado"; sequência olha 90 dias; lembretes notificam só o slot mais recente por rotina; gato/item arquivado some do cálculo; publicar exige confirmação do dono.
- **Risco conhecido:** entre T5 e T8 o app no branch fica transitório (a home antiga ainda usa o agendamento legado); nada é publicado nesse intervalo.
