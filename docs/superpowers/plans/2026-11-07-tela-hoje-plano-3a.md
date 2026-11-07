# Plano 3A — Tela Hoje (paridade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tela Hoje do app Expo com a mesma aparência, textos e comportamento da do site: sequência, atenção, linha do dia por paciente, registrar dose (Feito/Pular, com hora e valor), primeiros passos e boas-vindas.

**Architecture:** Leituras e mutações pela API v1 já existente (`GET /home`, `POST /doses`, `POST /onboarding/welcome`, `POST /onboarding/checklist/dismiss`) via TanStack Query. As funções de tempo (`time.ts`, fuso de Brasília) vão para `packages/shared` para o app e a API usarem o mesmo código. Componentes de domínio em React Native, com as mesmas classes do site; controles do navegador viram nativos (hora, sheets).

**Tech Stack:** Expo SDK 58, NativeWind 5 RC, `@tanstack/react-query`, `@gorhom/bottom-sheet`, `react-native-svg`, `expo-linear-gradient`, `@react-native-community/datetimepicker` (versão do `expo install`), jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3; escolhas 12 e 14). Base de código: Plano 2 (`docs/superpowers/plans/2026-11-07-base-do-app-expo.md`), já em `main`.

## Roteiro do Plano 3 (um plano por subsistema)

- **3A (este):** Hoje e o tour (boas-vindas e primeiros passos).
- **3B:** Pacientes (lista, novo, detalhe com abas Dados e Rotina) e Rotinas (nova, editar, encerrar).
- **3C:** Itens (lista, novo, detalhe).
- **3D:** Conta (membros, convites, aparência) e a tela de convite.

Cada plano termina com capturas lado a lado, em claro e escuro, e a aprovação do usuário (escolha 12). Os links "Cadastrar paciente", "Cadastrar item" e "Montar a rotina" da tela Hoje apontam para rotas que nascem em 3B/3C (`/pacientes/novo`, `/itens/novo`, `/pacientes`): até lá abrem a tela de rota inexistente do Expo Router, o que é aceitável porque o app ainda não foi publicado.

## Global Constraints

- Textos em pt-BR **iguais** aos do site (copiar de `apps/api/src/components/home/*`, `dose-card.tsx`, `status-badge.tsx`). Sem regra de negócio nova.
- Alvos de toque ≥ 44 px (`h-11`/`min-h-11`); contraste AA; status nunca só por cor (ícone + texto).
- Fuso fixo America/Sao_Paulo (`TZ` do `time.ts`), independente do fuso do aparelho.
- Sem cookies, senhas ou corpo de requisição em log.
- Versões novas fixadas exatas (`npx expo install` e depois remover `^`/`~`).
- `grid` do site vira flex; opacidade `/NN` só com tokens de alfa explícitos (Plano 2); ícones recebem cor por `useColors()`; ícone/rótulo de acessibilidade em tudo que é toque.
- TDD: cada tarefa começa por teste que falha; `npm test` da raiz fica verde (API 303 + shared + app).
- O push (`EnableNotifications`) é do Plano 4: o app **não** renderiza o aviso de notificações nesta tela; o passo "Ativar os avisos" do checklist continua aparecendo (vem da API) e leva a `/conta`.

## Review Focus

1. **Fuso do aparelho:** em um aparelho em UTC ou em outro fuso, horários, chaves de dia ("hoje", "ontem") e `formatLongDate` continuam em Brasília (teste com `TZ=UTC` e `TZ=Asia/Tokyo`).
2. **Intl no Hermes:** `pt-BR` com `timeZone` e `weekday: "long"` formata como no site; se o Hermes divergir, a diferença fica documentada e o teste cobre o texto esperado.
3. **Toque duplo em Feito:** segundo toque durante o envio não registra duas vezes; "já registrado por outra pessoa" (`recorded:false`) mostra o aviso e atualiza a lista.
4. **Hora da aplicação perto da meia-noite** e relógio do aparelho adiantado (regras de `resolveAppliedTime`): o app envia `appliedAt` e trata 422 (`invalid_applied_at`) com "Hora da aplicação inválida. Confira o horário." e 409 (`too_early`) com "Este cuidado ainda não está na hora.".
5. **Dia passado (`?dia=`) e dia inexistente:** ao tocar num dia da semana, a tela mostra aquele dia e "Voltar para hoje"; dia inválido na URL cai em hoje.

---

### Task 1: Funções de tempo no `packages/shared`

**Files:**
- Move: `apps/api/src/lib/time.ts` → `packages/shared/src/time.ts`; `apps/api/tests/time.test.ts` → `packages/shared/tests/time.test.ts`
- Modify: `packages/shared/src/index.ts` (exporta `./time`); `apps/api/src/lib/time.ts` vira `export * from "@medicron/shared";` restrito aos nomes de tempo (re-export nomeado), para não editar todos os importadores
- Test: `packages/shared/tests/time.test.ts`

**Interfaces:**
- Produces: tudo o que `time.ts` exporta hoje (`TZ`, `parseLocalInput`, `toLocalInput`, `formatDateTime`, `formatTime`, `formatLongDate`, `relativeLabel`, `intervalLabel`, `nextQuarterHourInput`, `resolveAppliedTime`, `dayKey`, `dayBounds`, `addDays`, `windowEnd`, `weekKeys`, `weekdayShort`), com as mesmas assinaturas, importáveis de `@medicron/shared`.

- [ ] **Step 1: Write the failing test** — mover `time.test.ts` para `packages/shared/tests/` (import de `../src/time`) e acrescentar: com `process.env.TZ` trocado para `UTC` e `Asia/Tokyo` (via `vi.stubEnv` + reimport ou `describe.each` em processos separados não é necessário: `Intl` com `timeZone` explícito não depende do TZ), `formatTime(new Date("2026-11-04T11:00:00Z"))` é `"08:00"`, `dayKey(new Date("2026-11-04T02:30:00Z"))` é `"2026-11-03"` e `formatLongDate(new Date("2026-11-04T15:00:00Z"))` é `"quarta-feira, 4 de novembro"`.
- [ ] **Step 2: Run** `npm test -w packages/shared -- time`. Expected: FAIL (módulo inexistente).
- [ ] **Step 3: Implement** a mudança de lugar com `git mv`; `apps/api/src/lib/time.ts` re-exporta os nomes de `@medicron/shared`; `packages/shared/src/index.ts` exporta `./time`.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde (API 303 menos os testes de `time` que foram para o shared; total de testes sem queda).
- [ ] **Step 5: Commit** `refactor: funções de tempo (fuso de Brasília) no packages/shared`.

### Task 2: Dados da tela Hoje (cliente, consultas e mutações)

**Files:**
- Create: `apps/app/src/lib/api/home.ts`, `apps/app/src/lib/home-queries.ts`
- Test: `apps/app/tests/home-api.test.ts`

**Interfaces:**
- Consumes: `ApiClient` (Plano 2), `HomeDto`, `OnboardingDto`, `doseBody` de `@medicron/shared`.
- Produces:
  - `fetchHome(client, dia?: string): Promise<{ home: HomeDto; hasPatients: boolean; onboarding: OnboardingDto }>` (`GET /home` com `?dia=` só quando informado).
  - `recordDose(client, body: DoseBody): Promise<{ recorded: true } | { recorded: false; reason: "already" | "too-early" | "invalid-time" }>`: 200 → mapeia `recorded`; `ApiClientError` com `code` `too_early` → `too-early`, `invalid_applied_at` → `invalid-time`; outros erros propagam.
  - `completeWelcome(client)` e `dismissChecklist(client)` (POST, 204).
  - `useHome(dia?)` (consulta `["home", dia ?? "today"]`, habilitada só logado), `useRecordDose()` (mutação que, ao terminar com sucesso ou "already", invalida `["home"]`), `useCompleteWelcome()`, `useDismissChecklist()` (invalidam `["home"]`).

- [ ] **Step 1: Write the failing test** — com cliente falso: `fetchHome` monta `/home` e `/home?dia=2026-11-03`; `recordDose` devolve `{recorded:true}`, `{recorded:false, reason:"already"}` para `recorded:false`, e mapeia 409/422 pelos códigos; um 500 propaga como `ApiClientError`; `useRecordDose` invalida `["home"]` (espiar `queryClient.invalidateQueries`).
- [ ] **Step 2: Run** `npm test -w apps/app -- home-api`. Expected: FAIL.
- [ ] **Step 3: Implement** as quatro funções e os quatro hooks nos arquivos acima.
- [ ] **Step 4: Run** `npm test -w apps/app -- home-api`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): dados da tela Hoje (home, doses e onboarding)`.

### Task 3: Tokens do degradê e primitivas visuais da Hoje

**Files:**
- Modify: `apps/app/scripts/sync-tokens.ts` (acrescenta `heroFrom`, `heroTo`, `heroCore` ao mapa de cores gerado), regenerar `apps/app/src/theme/colors.generated.ts`; `apps/app/package.json` (`expo-linear-gradient` pinado)
- Create: `apps/app/src/components/ui/hero-card.tsx` (cartão com degradê `heroFrom`→`heroTo`, claro/escuro), `apps/app/src/components/status-badge.tsx`, `apps/app/src/components/page-header.tsx`, `apps/app/src/components/progress-ring.tsx`
- Test: `apps/app/tests/home-primitives.test.tsx`, ampliar `apps/app/tests/tokens.test.ts`

**Interfaces:**
- Produces: `HeroCard({ className?, children })` (usa `LinearGradient` com `useColors()`); `StatusBadge({ tone: "overdue"|"now"|"upcoming"|"done"|"skipped", className? })` (rótulos Atrasada, Agora, Próxima, Feito, Pulado; ícone + texto); `PageHeader({ title, description? })` (título como `header`); `ProgressRing({ resolved, total, size? })` (SVG: anel de 64 px, arco `heroAccent` sobre trilho branco 25 %, centro `heroCore` com "x/y"; `accessibilityLabel` "`x` de `y` cuidados de hoje resolvidos").

- [ ] **Step 1: Write the failing tests** — `tokens.test.ts` exige as três chaves novas nas duas paletas; `home-primitives.test.tsx`: cada tom do `StatusBadge` mostra o rótulo certo; `PageHeader` expõe `header`; `ProgressRing` expõe o rótulo de acessibilidade e `0/0` não quebra (arco vazio); `HeroCard` renderiza filhos.
- [ ] **Step 2: Run** `npm test -w apps/app -- home-primitives tokens`. Expected: FAIL.
- [ ] **Step 3: Implement** as primitivas e o gerador; rodar `npm run sync-tokens -w apps/app`.
- [ ] **Step 4: Run** os testes. Expected: PASS; `npm run check-tokens -w apps/app` sem diferença.
- [ ] **Step 5: Commit** `feat(app): degradê, selo de status, cabeçalho de página e anel de progresso`.

### Task 4: Registrar dose (Feito, Pular e a gaveta de hora e valor)

**Files:**
- Create: `apps/app/src/components/time-field.tsx` e `apps/app/src/components/time-field.web.tsx` (campo de hora: nativo com `DateTimePicker` em modo `time`, web com `<input type="time">`), `apps/app/src/components/resolve-buttons.tsx`, `apps/app/src/components/dose-card.tsx`
- Test: `apps/app/tests/resolve-buttons.test.tsx`

**Interfaces:**
- Consumes: `useRecordDose` (T2), `resolveAppliedTime`, `toLocalInput` (T1), `Drawer`, `FormField`, `Input`, `Button`, `toast` (Plano 2), `StatusBadge` (T3).
- Produces:
  - `TimeField({ value: "HH:mm", onChange(value: string) , label })` — `accessibilityLabel` igual ao rótulo; alvo ≥ 44 px.
  - `ResolveButtons({ planId, scheduledFor, kind, reschedule, itemName, patientName, size? })`: "Feito" (com spinner e desabilitado enquanto envia) e "Pular". Procedimento ou `reschedule` abrem a gaveta (título = item, descrição = paciente, "· registre o resultado, se quiser." para procedimento) com "Hora da aplicação" (só `reschedule`; dica "Ajuste se a aplicação foi antes de você marcar."; inicia na hora atual), "Valor" (dica "Ex.: 38,7 °C — opcional", máx. 60) e "Observação" (dica "Opcional", máx. 300) só em procedimento, botões "Cancelar" e "Confirmar". Ao enviar, converte a hora com `resolveAppliedTime(hhmm, new Date(scheduledFor), new Date())`; se `null`, avisa "Hora da aplicação inválida. Confira o horário." sem chamar a API.
  - Avisos: registrado → `toast.success("Registrado")` ou `"Marcado como pulado"`; `too-early` → `toast.info("Este cuidado ainda não está na hora.")`; `invalid-time` → `toast.error("Hora da aplicação inválida. Confira o horário.")` (a gaveta fica aberta); `already` → `toast.info("Este horário já tinha sido registrado por outra pessoa.")`.
  - `DoseCard({ planId, scheduledFor, patientName, itemName, dose, kind, reschedule, timeLabel, relative, tone })`: cartão com faixa lateral colorida (`destructive`/`warning`/`info`), ícone de pílula ou estetoscópio em círculo `brand-soft`, textos como no site, `StatusBadge`, e `ResolveButtons` quando `tone !== "upcoming"`.

- [ ] **Step 1: Write the failing tests** — medicação simples: tocar em "Feito" chama `recordDose` com `outcome:"done"` e sem abrir a gaveta; "Pular" chama com `skipped`; toque duplo rápido chama **uma vez** (botão desabilitado enquanto pendente); procedimento: "Feito" abre a gaveta, preencher valor e observação e "Confirmar" envia `value` e `note`; `reschedule`: a gaveta mostra "Hora da aplicação", e "Confirmar" envia `appliedAt` coerente com `resolveAppliedTime` (relógio simulado); hora inválida mostra o aviso e não chama a API; as quatro respostas (`recorded`, `too-early`, `invalid-time`, `already`) mostram os avisos acima; "Cancelar" fecha sem enviar; `DoseCard` mostra faixa e selo por tom e esconde botões em `upcoming`.
- [ ] **Step 2: Run** `npm test -w apps/app -- resolve-buttons`. Expected: FAIL.
- [ ] **Step 3: Implement** `TimeField` (instalar `@react-native-community/datetimepicker` com `npx expo install`, pinar), `ResolveButtons` e `DoseCard`. No jest, mapear o `DateTimePicker` para um mock simples que chama `onChange`.
- [ ] **Step 4: Run** os testes e `npx expo export -p web` em `apps/app`. Expected: PASS; export sem erro.
- [ ] **Step 5: Commit** `feat(app): registrar dose com gaveta de hora e valor, e cartão de dose`.

### Task 5: Blocos da Hoje (sequência, atenção, linha do dia)

**Files:**
- Create: `apps/app/src/components/home/streak-card.tsx`, `attention-list.tsx`, `day-timeline.tsx`
- Test: `apps/app/tests/home-blocks.test.tsx`

**Interfaces:**
- Consumes: `HomeDto`/`EntryDto` (shared), `DoseCard`/`ResolveButtons`/`StatusBadge`/`ProgressRing`/`HeroCard` (T3, T4), `dayKey`, `formatTime`, `formatDateTime`, `relativeLabel`, `weekdayShort` (T1), `EmptyState` (Plano 2).
- Produces:
  - `StreakCard({ streak, week, progress, closedToday, riskCount, onSelectDay(key: string, isToday: boolean) })` — título "Comece sua sequência: feche o dia de hoje" / "1 dia em dia" / "`n` dias seguidos em dia"; "Dia fechado!" ou "Faltam `n` para fechar hoje"; aviso de risco "Ontem tem `n` dose(s) sem registro: resolva até hoje 23:59 para manter a sequência"; 7 células (`h-11`) com ícone por status (✓, !, ⚠, "hoje", –), anel `heroAccent` no dia de hoje, `accessibilityLabel` "`dia da semana`, `número`: `hoje, ` `estado`" e dias futuros sem toque. Rótulos de estado: ok "em dia", open "em andamento", pending "pendente", lost "dose sem solução", empty "sem cuidados".
  - `AttentionList({ entries, now })` — título "Precisa de atenção · `n`", `DoseCard` por entrada (`tone` now→"now", senão "overdue"; horário só `HH:mm` se for hoje, senão data e hora), 5 primeiros e botão "Ver todas (`n`)".
  - `DayTimeline({ patients, selectedKey, todayKey, selectedStatus, onBackToToday })` — "Linha do dia", "Voltar para hoje" em dia passado, "Dia `dd/mm`" com "Dose sem solução" ou "Em dia"; abas de pacientes (pílulas `h-11`, `ScrollView` horizontal, contador de pendentes em `destructive` ou `x/y`), lista com horário, item, dose·valor, selo de estado (Feito, Pulado, Sem registro, Agora, Mais tarde), "`quem` · `hora`", "registrada depois", observação entre aspas, e `ResolveButtons size="default"` para `missed`/`now`; vazio: `EmptyState` "Nenhum cuidado neste dia" / "Quando houver cuidados esperados, eles aparecem aqui.".

- [ ] **Step 1: Write the failing tests** — `StreakCard`: os três títulos, "Dia fechado!", aviso de risco no singular e plural, rótulo de acessibilidade da célula de hoje e de um dia perdido, célula futura sem toque, tocar em um dia chama `onSelectDay`; `AttentionList`: vazia não renderiza, 7 entradas mostram 5 e "Ver todas (7)" mostra as 7, `tone` e rótulo de horário; `DayTimeline`: abas trocam o paciente, contador `x/y` e contador de pendentes, estados e textos de cada entrada, vazio, "Voltar para hoje" só em dia passado e chama `onBackToToday`.
- [ ] **Step 2: Run** `npm test -w apps/app -- home-blocks`. Expected: FAIL.
- [ ] **Step 3: Implement** os três componentes.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): sequência, atenção e linha do dia`.

### Task 6: Primeiros passos e boas-vindas (o tour)

**Files:**
- Create: `apps/app/src/components/home/first-steps-card.tsx`, `apps/app/src/components/home/welcome-sheet.tsx`
- Test: `apps/app/tests/home-onboarding.test.tsx`

**Interfaces:**
- Consumes: `useCompleteWelcome`, `useDismissChecklist` (T2), `Drawer`, `Button`, `Icon` (Plano 2), `OnboardingDto["checklist"]["steps"]`.
- Produces:
  - `FirstStepsCard({ steps, onNavigate(href: string) })` — "Primeiros passos", contador `x/4`, barra de progresso com `accessibilityRole="progressbar"`, 4 passos (Cadastrar um paciente → `/pacientes/novo`; Cadastrar uma medicação ou procedimento → `/itens/novo`; Montar a rotina → `/pacientes`; Ativar os avisos no celular → `/conta`), feito riscado, pendente é toque `min-h-11`; "Dispensar" (ou "Concluir" com tudo feito) esconde na hora e chama `useDismissChecklist`.
  - `WelcomeSheet()` — Drawer com 4 slides (títulos e textos do site: "Bem-vindo ao Medicron", "Cadastre pacientes e itens", "Monte a rotina", "Marque como feito"), ícone em quadrado com degradê, pontos de passo (alvo 24 px mínimo, com `accessibilityLabel` "Ir para o passo `n`"), deslizar para os lados (50 px) troca de slide, "Pular"/"Próximo", último slide "Voltar" e "Concluir e começar"; concluir, pular ou fechar o sheet chamam `useCompleteWelcome` uma vez.

- [ ] **Step 1: Write the failing tests** — `FirstStepsCard`: progresso `2/4` com `progressbar` (`aria-valuenow`), passo feito sem toque, passo pendente navega ao `href`, "Dispensar" chama a mutação e some, tudo feito troca por "Concluir"; `WelcomeSheet`: mostra o slide 1, "Próximo" avança até o 4º, no 4º aparecem "Voltar" e "Concluir e começar", gesto de deslizar (touchStart/End com 80 px) troca de slide, "Pular", "Concluir e começar" e dispensar o sheet chamam `completeWelcome` **uma vez**.
- [ ] **Step 2: Run** `npm test -w apps/app -- home-onboarding`. Expected: FAIL.
- [ ] **Step 3: Implement** os dois componentes.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): primeiros passos e boas-vindas`.

### Task 7: A tela Hoje (composição, dia selecionado, rolagem e estados)

**Files:**
- Modify: `apps/app/src/app/(app)/index.tsx` (substitui o provisório), `apps/app/src/app/(app)/_layout.tsx` (a área de conteúdo passa a rolar: `ScrollView` com `RefreshControl` opcional por tela, mantendo a folga de 112 px sob a barra de abas)
- Create: `apps/app/src/components/home/home-view.tsx`, `apps/app/src/components/error-view.tsx`
- Test: `apps/app/tests/home-screen.test.tsx`, ajustar `apps/app/tests/shell.test.tsx`

**Interfaces:**
- Consumes: tudo de T2 a T6, `useLocalSearchParams<{ dia?: string }>`, `useRouter`, `PageHeader`, `EmptyState`.
- Produces:
  - `HomeView({ home, hasPatients, onboarding, onSelectDay, onBackToToday, onNavigate })`: ordem como no site — título "Hoje" com `formatLongDate(now)` → `WelcomeSheet` (se `showWelcome`) → `FirstStepsCard` (se `checklist.show`) → sem pacientes: `EmptyState` "Comece cadastrando seu primeiro paciente" / "Depois é só cadastrar as medicações e montar a rotina de cada um." com botão "Cadastrar paciente" (`/pacientes/novo`); com pacientes: `StreakCard`, `AttentionList`, `DayTimeline`. `riskCount` = entradas de atenção cujo `dayKey` está em `streak.pendingKeys`.
  - Tela `index`: lê `dia` da rota, chama `useHome(dia)`, mostra esqueleto enquanto carrega, `ErrorView` ("Algo deu errado" com "Tentar de novo") em erro, puxar para atualizar (`RefreshControl`) refaz a consulta; tocar num dia da semana navega para `/?dia=<key>` (hoje: sem parâmetro); "Voltar para hoje" limpa o parâmetro.
  - `ErrorView({ onRetry })`: igual ao `error-view.tsx` do site (texto e ícone), botão com 44 px.

- [ ] **Step 1: Write the failing tests** — com `fetchHome` simulado: estado de carregamento (esqueleto), erro com "Tentar de novo" refazendo a consulta, sem pacientes mostra o vazio e o botão leva a `/pacientes/novo`, com pacientes mostra os três blocos na ordem, `riskCount` correto, tocar num dia navega a `/?dia=2026-11-03`, "Voltar para hoje" navega a `/`, `dia` inválido na rota vai à API como veio e a resposta (`selectedKey` = hoje) é exibida sem "Voltar para hoje", puxar para atualizar refaz `fetchHome`; `shell.test.tsx` segue verde com o conteúdo rolável.
- [ ] **Step 2: Run** `npm test -w apps/app -- home-screen shell`. Expected: FAIL.
- [ ] **Step 3: Implement** `HomeView`, `ErrorView`, a tela e a rolagem no layout do grupo.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint` e `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): tela Hoje com paridade`.

### Task 8: Conferência contra o site e aprovação (com o usuário)

**Files:** nenhum arquivo de código (capturas fora do repositório).

**Interfaces:** consome tudo.

- [ ] **Step 1: Rodar** o app no simulador (`EXPO_PUBLIC_API_URL=https://medicron.com.br npx expo start --ios`) com a conta do usuário (login feito **pelo usuário**).
- [ ] **Step 2: Verificar** no aparelho: formatos de data e hora no Hermes (Review Focus 2), registrar uma dose de verdade com o usuário (Feito, Pular, procedimento com valor, reprogramar com hora), o tour (conta nova ou reset do `onboarding` pelo usuário), dia passado, teclado dentro da gaveta em iPhone pequeno, claro e escuro.
- [ ] **Step 3: Capturas lado a lado** com `https://medicron.com.br` (mesma largura de celular e de desktop, claro e escuro) para Hoje com dados, Hoje vazia, gaveta de dose e boas-vindas, no molde usado no Plano 2. Se o degradê (`expo-linear-gradient`) ou o anel destoarem, ajustar com teste antes de seguir.
- [ ] **Step 4: Mostrar** as capturas ao usuário e só seguir com a aprovação dele; ajustes pedidos entram como correções com teste.

### Task 9: Fechamento do Plano 3A

**Files:**
- Modify: `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3: Hoje concluída), `README.md` (nota sobre o push da Hoje ficar para o Plano 4)

- [ ] **Step 1: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 2: Publicar** `vercel --prod --yes` (a API mudou só pelo re-export de `time`) e conferir `/entrar` e `/api/v1/config` em `https://medicron.com.br`.
- [ ] **Step 3: Atualizar** o documento de design e o README, e commitar `docs: Plano 3A concluído (tela Hoje)`.
