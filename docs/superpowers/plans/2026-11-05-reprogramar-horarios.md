# Reprogramar horários Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rotinas com o switch "Reprogramar horários" ligado deslocam as próximas doses a partir da hora real em que a dose foi aplicada (13h00 aplicada às 13h20 → próxima às 17h20).

**Architecture:** Nova coluna `care_plans.reschedule`. `resolveSlot` ganha `appliedAt`; quando a rotina reprograma e o resultado é `done`, a âncora da rotina passa a ser `appliedAt` e os horários futuros não resolvidos são apagados e regenerados por `ensureSlots` (mesmo mecanismo de `updatePlan`). A UI abre o sheet de "Feito" com um campo "Hora da aplicação" quando a rotina reprograma.

**Tech Stack:** Next.js (App Router, server actions), Drizzle + Postgres (PGlite nos testes), Vitest, shadcn/base-ui.

**Spec:** conversa de brainstorming de 2026-11-05 (resumo aprovado no chat; não há documento de design). Antes de mexer em código Next, consultar `node_modules/next/dist/docs/` (AGENTS.md).

## Global Constraints

- Textos de interface em português do Brasil, com acentuação correta.
- Horários em Brasília (UTC-3 fixo), via `src/lib/time.ts`.
- Switch **desligado por padrão**; rotinas existentes ficam com `reschedule = false` e se comportam como hoje.
- "Pular" nunca desloca a sequência.
- `appliedAt` não pode ser no futuro; pode ser antes do horário previsto, até no máximo metade do intervalo antes.
- Procedimento continua abrindo o sheet (Valor/Observação); medicação sem reprogramação continua com um toque só.
- Fora do escopo: editar o switch de uma rotina existente; dica "Próxima dose: HH:mm" no sheet.
- Commits em português (`feat:`, `test:`), terminando com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## Review Focus

- Aplicação adiantada (antes do horário previsto) desloca a sequência para trás (11h00 aplicada às 10h40 → 16h40).
- Hora no futuro ou mais de meia janela antes do horário previsto é rejeitada e nada é gravado.
- Segunda chamada sobre o mesmo horário (`recorded:false`) não desloca de novo.
- Resolver um horário antigo (já existe horário posterior vencido) registra normalmente mas **não** desloca a grade.
- `endAt` é respeitado depois do deslocamento (não nascem horários além da data final).
- Hora digitada "23:50" às 00:10 vira ontem 23:50, não amanhã.

---

### Task 1: Coluna `reschedule`, criação de rotina e switch no formulário

**Files:**
- Modify: `src/lib/db/schema.ts` (tabela `carePlans`)
- Create: `drizzle/0003_*.sql` + `drizzle/meta/*` (gerados)
- Modify: `src/lib/services/plans.ts` (`planInput`, `createPlan`)
- Modify: `src/app/(app)/gatos/[id]/rotina/actions.ts` (`createPlanAction`)
- Modify: `src/components/plan-form.tsx`
- Test: `tests/services/plans.test.ts`

**Interfaces:**
- Produces: `carePlans.reschedule: boolean` (not null, default false); `PlanInput.reschedule?: boolean`; `CarePlan.reschedule`.

- [ ] **Step 1: Write the failing test** em `tests/services/plans.test.ts`: `createPlan` sem `reschedule` devolve `plan.reschedule === false`; com `reschedule: true` devolve `true`.
- [ ] **Step 2: Run** `npx vitest run tests/services/plans.test.ts` — Expected: FAIL (propriedade inexistente).
- [ ] **Step 3: Add** `reschedule: boolean("reschedule").notNull().default(false)` em `carePlans`; rodar `npm run db:generate` (gera a migração 0003 com um único `ALTER TABLE "care_plans" ADD COLUMN "reschedule" boolean DEFAULT false NOT NULL`). Em `planInput` adicionar `reschedule: z.boolean().optional()` e gravar `reschedule: p.reschedule ?? false` no insert.
- [ ] **Step 4: Action e formulário.** `createPlanAction` lê `f.get("reschedule") === "on"` e passa `reschedule`. Em `PlanForm`, dentro da `Section title="Quando"` após a primeira dose, adicionar um `Switch` (`@/components/ui/switch`, `name="reschedule"`, `id="reschedule"`) com rótulo **"Reprogramar horários"** e texto de apoio **"Se uma dose atrasar, as próximas acompanham a hora real da aplicação."**. Verificar no `switch.tsx` se o componente envia o valor `on` num form nativo; se não, usar um `<input type="hidden">` sincronizado.
- [ ] **Step 5: Run** `npx vitest run tests/services/plans.test.ts` — Expected: PASS. Rodar também `npx tsc --noEmit`.
- [ ] **Step 6: Commit** `feat: opção reprogramar horários no cadastro da rotina`.

### Task 2: `resolveSlot` com hora real e deslocamento da sequência

**Files:**
- Modify: `src/lib/services/slots.ts` (`ResolveInput`, `resolveSlot`, nova `InvalidAppliedAt`)
- Modify: `src/lib/time.ts` (nova `localTimeToRecent`)
- Test: `tests/services/resolve.test.ts`, `tests/time.test.ts`

**Interfaces:**
- Consumes: `CarePlan.reschedule` (Task 1), `ensureSlots`, `EARLY_WINDOW_MS`.
- Produces:
  - `ResolveInput.appliedAt?: Date`
  - `class InvalidAppliedAt extends Error` (exportada de `slots.ts`)
  - `localTimeToRecent(hhmm: string, now: Date): Date` em `time.ts`: data de `now` em Brasília com a hora `hhmm`; se resultar depois de `now`, usa o dia anterior.

- [ ] **Step 1: Write the failing tests.** Em `tests/time.test.ts`: `localTimeToRecent("23:50", 2026-11-05T03:10:00Z)` (00:10 em Brasília) → `2026-11-05T02:50:00Z` (ontem 23:50); `localTimeToRecent("09:30", 2026-11-04T15:00:00Z)` → `2026-11-04T12:30:00Z`.

  Em `tests/services/resolve.test.ts`, usar `setup` com rotina de 360 min, âncora `2026-11-04T11:00:00Z`, `reschedule: true` (parametrizar `setup`), `now = 11:25Z` salvo indicação:
  1. `reschedule atrasado`: resolver 11:00Z com `appliedAt` 11:20Z → depois de `ensureSlots(db, now, "o1")`, horários não resolvidos = `[17:20Z, 23:20Z]`; slot das 11:00 com `outcome "done"` e `resolvedAt` 11:20Z; `plan.anchorAt` 11:20Z e `nextDueAt` 17:20Z.
  2. `reschedule adiantado`: `now` 11:03Z, `appliedAt` 10:40Z → próximo não resolvido 16:40Z.
  3. `appliedAt` no futuro (now + 1 min) e `appliedAt` 07:00Z (mais de 3 h antes) → `rejects.toBeInstanceOf(InvalidAppliedAt)` e nenhum slot resolvido.
  4. `skipped` com `appliedAt`: grade continua `[17:00Z, 23:00Z]`, âncora inalterada.
  5. Rotina com `reschedule: false` e `appliedAt`: grade inalterada e `resolvedAt` = `now`.
  6. Segunda chamada no mesmo horário (`outcome done`, `appliedAt` 11:50Z, `now` 11:55Z) → `{ recorded: false }` e `anchorAt` continua 11:20Z.
  7. Horário antigo: `now` 23:05Z, resolver 11:00Z com `appliedAt` 23:00Z → registra, mas `anchorAt` continua `2026-11-04T11:00:00Z` (existe horário posterior vencido).
  8. `endAt` 20:00Z: após o deslocamento (11:00 aplicada 11:20, now 11:25) só resta o horário 17:20Z.
- [ ] **Step 2: Run** `npx vitest run tests/time.test.ts tests/services/resolve.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement `localTimeToRecent`** reutilizando `dayKey`, `parseLocalInput` e `addDays` (ou subtraindo 24 h).
- [ ] **Step 4: Implement em `resolveSlot`.** Ordem: (a) buscar a rotina; se `reschedule`, `outcome === "done"` e `appliedAt` informado, validar `appliedAt <= now` e `appliedAt >= scheduledFor − intervalMinutes/2`, senão lançar `InvalidAppliedAt` (mensagem: "Hora da aplicação inválida") antes de gravar; (b) numa transação, gravar o slot com `resolvedAt = appliedAt ?? now` (só honrar `appliedAt` se a rotina reprograma) e, se `recorded` e o slot é o último vencido (nenhum outro slot da rotina com `scheduledFor` em `(scheduledFor, now + EARLY_WINDOW_MS]`), deslocar: apagar slots não resolvidos com `scheduledFor > max(scheduledFor, appliedAt)` e atualizar a rotina com `anchorAt = appliedAt`, `nextDueAt = startsAt = appliedAt + intervalMinutes`, `slotsThrough = null`. Seguir o padrão de `updatePlan` em `src/lib/services/plans.ts`.
- [ ] **Step 5: Run** `npx vitest run` — Expected: tudo PASS (inclui `dispatch` e `home`).
- [ ] **Step 6: Commit** `feat: resolver com hora real desloca os próximos horários`.

### Task 3: Sheet com "Hora da aplicação" na interface

**Files:**
- Modify: `src/app/(app)/actions.ts` (`recordDoseAction`)
- Modify: `src/lib/services/home.ts` (`DayEntry.reschedule`)
- Modify: `src/components/home/resolve-buttons.tsx`, `src/components/dose-card.tsx`, `src/components/home/attention-list.tsx`, `src/components/home/day-timeline.tsx`
- Test: `tests/services/home.test.ts`

**Interfaces:**
- Consumes: `localTimeToRecent`, `InvalidAppliedAt` (Task 2).
- Produces:
  - `DayEntry.reschedule: boolean` (vem de `plan.reschedule`; `serialize.ts` já repassa os campos por spread).
  - `recordDoseAction` input aceita `appliedTime?: string` ("HH:mm") e retorna `reason?: "already" | "too-early" | "invalid-time"`.
  - `ResolveButtons` e `DoseCardProps` ganham `reschedule: boolean`.

- [ ] **Step 1: Write the failing test** em `tests/services/home.test.ts`: entrada de uma rotina com `reschedule: true` aparece com `reschedule === true`, e a de rotina comum com `false`.
- [ ] **Step 2: Run** `npx vitest run tests/services/home.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement** `reschedule: plan.reschedule` em `DayEntry` e no mapeamento de `getHome`.
- [ ] **Step 4: Action.** `recordDoseAction`: se `appliedTime` vier, calcular `appliedAt = localTimeToRecent(appliedTime, new Date())` e passar a `resolveSlot`; capturar `InvalidAppliedAt` devolvendo `{ recorded: false, reason: "invalid-time" }`.
- [ ] **Step 5: UI.** Repassar `reschedule` de `attention-list.tsx` e `day-timeline.tsx` até `ResolveButtons` (via `DoseCard` no primeiro). Em `ResolveButtons`: o botão "Feito" abre o sheet quando `kind === "procedure" || reschedule`; no sheet, se `reschedule`, mostrar `FormField` "Hora da aplicação" com `<Input type="time" name="appliedTime" required>` e `defaultValue` = hora atual de Brasília (`toLocalInput(new Date()).slice(11)`, calculada ao abrir), com dica "Ajuste se a aplicação foi antes de você marcar."; Valor e Observação só aparecem para `kind === "procedure"`. Enviar `appliedTime` em `submit("done", …)`. Tratar `reason === "invalid-time"` com `toast.error("Hora da aplicação inválida. Confira o horário.")` e manter o sheet aberto.
- [ ] **Step 6: Verify.** `npx vitest run`, `npx tsc --noEmit`, `npm run lint`, `npm run build` — Expected: sem erros. Depois conferir no navegador (`npm run dev`): rotina nova com switch ligado, "Feito" abre o sheet com a hora atual; ajustar para 20 min depois/antes e confirmar que o próximo horário da tela mudou; rotina sem o switch continua com um toque.
- [ ] **Step 7: Commit** `feat: sheet com hora da aplicação ao marcar feito`.
