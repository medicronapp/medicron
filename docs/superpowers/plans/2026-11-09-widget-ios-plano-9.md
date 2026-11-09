# Widget do iOS (Plano 9)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execução nativa). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Um widget de tela inicial (médio) e de tela de bloqueio (retangular e em linha) que mostram as **próximas doses** e as **pendentes mais recentes**, atualizados pelo app.

**Architecture:** `expo-widgets` (SDK 58). O widget é um componente `'widget'` isolado (sem rede, hooks nem imports): o **app** calcula tudo e entrega por props. Uma função pura monta a *timeline* do dia (uma entrada a cada mudança de estado: dose entra na janela de ±15 min, vira pendente), então o widget avança sozinho entre aberturas do app. Um hook no `Gate` regrava a timeline quando a Hoje muda (abrir o app, registrar dose) e limpa ao sair da conta.

**Tech Stack:** expo-widgets, @expo/ui (SwiftUI), TanStack Query, jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md`; decisões do usuário (2026-11-09): tamanhos **médio** e **tela de bloqueio**; atualização por **timeline do dia + ao abrir o app** (sem push silencioso).

## Global Constraints

- Português do Brasil com acentos; só iOS (sem Android/web); nada de rede no widget; sem segredos no repositório.
- App Group `group.app.medicron` e extensão `app.medicron.ExpoWidgetsTarget` (padrões do plugin). Janela de dose "agora" = ±15 min (igual ao servidor, `EARLY_WINDOW_MS`).
- Horários em Brasília (`formatTime` de `@medicron/shared`). Nenhum dado de saúde além do que já aparece na tela Hoje; widget vazio e sem nomes quando não há sessão.
- Nenhum build ou publicação neste plano: o build do TestFlight é passo do usuário.

## Review Focus

1. Sair da conta ou excluí-la limpa o widget (nome de paciente/remédio não pode ficar na tela inicial de um aparelho sem sessão).
2. Dose registrada some do widget ao voltar ao app; dose perdida vira pendente na hora certa mesmo sem abrir o app.
3. Sem doses hoje / tudo em dia / lista longa (corte em 3 e 2, com contagem total) / nomes longos.
4. Virada do dia: a timeline termina no fim do dia de Brasília e o widget não mostra "próximas" de ontem.
5. O widget não usa nada fora do contrato do runtime (sem hooks, imports de módulo nem constantes de módulo dentro do componente).

---

### Task 1: Dependências e configuração do plugin

**Files:** Modify `apps/app/package.json` (+lock), `apps/app/app.json`; Test `apps/app/tests/store-config.test.ts`.

- [ ] **Step 1: Teste (RED)**: em `store-config.test.ts`, o plugin `expo-widgets` existe com um widget `MedicronWidget`, `supportedFamilies` exatamente `["systemMedium","accessoryRectangular","accessoryInline"]`, `initialLayout` apontando para um arquivo que existe; sem `enableAndroid`.
- [ ] **Step 2: Rodar** `npx jest tests/store-config.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar**: `npx expo install expo-widgets @expo/ui`; plugin `["expo-widgets", { widgets: [{ name: "MedicronWidget", displayName: "Medicron", description: "Próximas doses e pendentes", ios: { supportedFamilies: [...], initialLayout: "./src/widgets/medicron-widget.tsx" } }] }]`. Conferir `lightningcss` 1.30.1 no lock. Validar a configuração: `npx expo config --type introspect` mostra o plugin sem erro e `npx expo prebuild --platform ios --no-install` (em cópia descartável) cria o alvo da extensão; se o EAS precisar de `extra.eas.build.experimental.ios.appExtensions` para as credenciais da extensão, declará-lo no `app.json`.
- [ ] **Step 4: Rodar** o teste e a suíte. Commit `feat(app): configuração do widget (expo-widgets)`.

### Task 2: Montagem da timeline (função pura)

**Files:** Create `apps/app/src/lib/widget-data.ts`; Test `apps/app/tests/widget-data.test.ts`.

**Interfaces:**
- `type WidgetItem = { time: string; item: string; patient: string; dose: string | null; late: boolean }` (`time` = "HH:mm"; `late` = pendente por atraso).
- `type WidgetProps = { status: "ok" | "empty" | "signedOut"; upcoming: WidgetItem[]; pending: WidgetItem[]; pendingCount: number; upcomingCount: number; updatedAt: string }` (`upcoming` ≤ 3 em ordem crescente; `pending` ≤ 2, **os mais recentes**, em ordem decrescente de horário; `empty` = não há dose nenhuma hoje; `ok` com listas vazias = tudo em dia).
- `buildWidgetTimeline(now: Date, home: HomeDto | null): { date: Date; props: WidgetProps }[]` — `null` → uma entrada `signedOut`. Considera `home.attention` (pendentes: `missed`/`now`) e as entradas `later`/`now`/`missed` de `home.patients` do dia, sem duplicar (`planId`+`scheduledFor`), ignora `done`/`skipped`. Entradas em `now` e a cada `scheduledFor ± 15 min` ainda dentro do dia de Brasília (máx. 24). Em cada instante `t`: diff = slot − t; `< −15min` → pendente (late), `|diff| ≤ 15min` → pendente (agora), senão próxima.
- `signedOutProps(): WidgetProps`.

- [ ] **Step 1: Testes (RED)**: sem sessão (`null`) → uma entrada `signedOut`, listas vazias; dia sem doses → `empty`; duas doses futuras → entrada em `now` com `upcoming` = as duas e entradas nas fronteiras (dose−15min vira pendente "agora"; dose+15min vira `late`); dose já `done` não aparece; lista longa (5 próximas, 4 pendentes) → `upcoming` 3, `pending` 2 (as mais recentes), contagens 5 e 4; duplicata entre `attention` e `patients` conta uma vez; entradas ficam em ordem crescente de `date` e param no fim do dia de Brasília (23:59:59); nenhuma entrada no passado exceto a primeira (`now`); formato "08:00".
- [ ] **Step 2: Rodar** `npx jest tests/widget-data.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** a função pura (só `@medicron/shared` e tipos). **Step 4: Rodar** o teste. Commit `feat(app): timeline do widget (próximas doses e pendentes)`.

### Task 3: O widget (SwiftUI via Expo UI)

**Files:** Create `apps/app/src/widgets/medicron-widget.tsx`; Test `apps/app/tests/medicron-widget.test.tsx`.

**Interfaces:** `export default createWidget<WidgetProps>("MedicronWidget", component, signedOutProps-equivalente literal)`; o componente declara `'widget'`, recebe `(props, environment)` e escolhe o layout por `environment.widgetFamily`: **systemMedium** (cabeçalho "Medicron" + duas colunas "Próximas" (3) e "Pendentes" (2, com contagem total quando passa de 2)); **accessoryRectangular** (próxima dose "08:00 · Remédio" e "N pendentes"); **accessoryInline** (texto de uma linha). Estados: `signedOut` → "Abra o Medicron para entrar"; `empty` → "Sem doses hoje"; `ok` sem listas → "Tudo em dia". Raiz com `containerBackground(PlatformColor('systemBackground'), 'widget')`. Tudo que o componente usa é declarado dentro dele (regra do runtime).

- [ ] **Step 1: Testes (RED)** (com `expo-widgets` e `@expo/ui/swift-ui` simulados como elementos simples): função do componente chamada com cada família e cada estado; texto resultante (achatando a árvore) contém o esperado: horário e remédio da próxima dose, contagem de pendentes, "Tudo em dia", "Sem doses hoje", "Abra o Medicron para entrar"; nenhuma chamada a hooks (o componente é função pura: duas chamadas com as mesmas props dão a mesma árvore); o arquivo não importa nada além de `@expo/ui`, `expo-widgets` e `react-native` (teste lê o fonte).
- [ ] **Step 2: Rodar** `npx jest tests/medicron-widget.test.tsx`. Expected: FAIL.
- [ ] **Step 3: Implementar.** **Step 4: Rodar** teste, typecheck e lint. Commit `feat(app): widget Medicron (médio e tela de bloqueio)`.

### Task 4: Sincronização do app com o widget

**Files:** Create `apps/app/src/lib/widget-sync.ts`, `apps/app/src/lib/widget-sync.web.ts` (sem efeito); Modify `apps/app/src/app/_layout.tsx` (`Gate`), `apps/app/src/lib/session.tsx` (sair), `apps/app/src/components/delete-account.tsx`; Test `apps/app/tests/widget-sync.test.tsx`.

**Interfaces:** `useWidgetSync(): void` — com sessão, lê `useHome()` (hoje) e, a cada dado novo, chama `MedicronWidget.updateTimeline(buildWidgetTimeline(new Date(), data.home))`; sem sessão chama `clearWidget()`. `clearWidget(): void` → `updateTimeline([{ date: new Date(), props: signedOutProps() }])`. Só roda no iOS (`Platform.OS === "ios"`), erros engolidos (o widget é cortesia, nunca pode quebrar o app). `signOut` e a exclusão de conta chamam `clearWidget()`.

- [ ] **Step 1: Testes (RED)**: iOS + sessão + Hoje carregada → `updateTimeline` chamado com a timeline; Hoje muda (dose registrada) → chamado de novo com a lista nova; sem sessão → limpa; `signOut` e exclusão de conta limpam; Android/web não chamam nada; exceção do módulo não propaga.
- [ ] **Step 2: Rodar.** Expected: FAIL. **Step 3: Implementar** e ligar no `Gate`. **Step 4: Rodar** `npx jest`, typecheck, lint, `npx expo export -p web` e `-p ios`. Commit `feat(app): sincroniza o widget com a tela Hoje`.

### Task 5: Passos do usuário, revisão e fechamento

- [ ] **Step 1:** `docs/passos-do-usuario.md` (seção G): rodar `eas build --platform ios --profile production` de novo (o widget exige build novo; o EAS pode pedir para criar o App ID da extensão `app.medicron.ExpoWidgetsTarget` e o App Group `group.app.medicron`; se pedir erro de App Group, criar em developer.apple.com → Identifiers → App Groups e habilitar nos dois App IDs); `eas submit`; no iPhone: segurar a tela inicial → "+" → Medicron; tela de bloqueio → personalizar → widgets. Atualizar spec e README.
- [ ] **Step 2: Verificar** tudo da raiz. **Step 3: Revisão final** independente; corrigir Critical/Important com teste antes. **Step 4: Mesclar** em `main` (sem publicar nada: o widget só existe no próximo build).
