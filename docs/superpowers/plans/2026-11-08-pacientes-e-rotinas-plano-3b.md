# Plano 3B — Pacientes e Rotinas (paridade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As telas de Pacientes do app Expo com a mesma aparência, textos e comportamento do site: lista, novo paciente, detalhe com as abas Dados e Rotina (editar e arquivar o paciente; criar, editar e encerrar rotinas).

**Architecture:** Leituras e mutações pela API v1 já existente (`/patients`, `/patients/:id`, `/patients/:id/plans`, `/plans/:id`, `/items`) via TanStack Query, com invalidação das listas e da Hoje. As regras puras que o site usa (`species`, `format`, `schedule`) vão para `packages/shared`. Controles do navegador (select, date, datetime-local, switch, dialog) viram equivalentes nativos (sheet de opções, seletor de data/hora, `Switch`, sheet de confirmação). Navegação com `Stack` do Expo Router dentro de `(app)/pacientes`.

**Tech Stack:** Expo SDK 58, NativeWind 5 RC, `@tanstack/react-query`, `@gorhom/bottom-sheet`, `@react-native-community/datetimepicker` (já instalado no 3A), jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3; escolhas 12 e 14). Base: Planos 2 e 3A, já em `main`.

## Global Constraints

- Textos em pt-BR **iguais** aos do site (copiar de `apps/api/src/components/{patient-card,patient-form,plan-form,edit-plan-sheet,confirm-action,list-row,segmented-links,page-header}.tsx` e `apps/api/src/app/(app)/pacientes/**`). Sem regra de negócio nova.
- Alvos de toque ≥ 44 px; contraste AA; status e erros nunca só por cor.
- Fuso fixo America/Sao_Paulo nos campos de data e hora (mesmo truque do 3A: o seletor carrega o relógio do aparelho, o valor é "o relógio de Brasília").
- Sem cookies, senhas ou corpo de requisição em log.
- Versões novas fixadas exatas (`npx expo install` e remover `^`/`~`).
- `grid` do site vira flex; opacidade `/NN` só com tokens de alfa explícitos; ícones recebem cor por `useColors()`.
- TDD em cada tarefa; `npm test` da raiz fica verde (API + shared + app); typecheck e lint limpos.
- Rotas novas dentro de `(app)/pacientes/` (`index`, `novo`, `[id]/index`, `[id]/rotina/nova`); o item "Pacientes" da barra de abas continua ativo em todas elas (`isActive` por segmento).
- Os botões "Cadastrar item" (estado "Cadastre um item primeiro") levam a `/itens/novo`, que nasce no 3C: até lá abre a tela de rota inexistente.
- Feedback de salvar: o site redireciona e mostra a tela atualizada; no app, além de manter o mesmo destino, um aviso `toast.success("Salvo")` confirma (decisão minha: no celular não há a troca de página para sinalizar).
- Confirmar uma ação destrutiva usa um sheet com "Cancelar" e o botão vermelho (equivalente nativo do Dialog do site).

## Review Focus

1. **Datas e fuso nos formulários:** data final e horário da primeira dose digitados em Brasília viram o instante UTC certo mesmo com o aparelho em outro fuso; editar uma rotina mostra a data final no relógio de Brasília.
2. **Peso com vírgula ("4,2") e valores inválidos** ("abc", "0", "501"): o app converte como o site e mostra erro de campo, sem enviar lixo; nascimento no futuro não quebra a idade.
3. **Frequência personalizada:** "Personalizada…" sem horas, com vírgula ("1,5" = 90 min), abaixo de 5 min ou absurda (> 1 ano) → erro de campo, sem chamada à API.
4. **Arquivar e encerrar:** toque duplo no botão de confirmar não executa duas vezes; depois de arquivar, o paciente some da lista e da Hoje, e voltar pela navegação não mostra o detalhe antigo; paciente arquivado/inexistente (404) mostra um estado de "não encontrado", não uma tela quebrada.
5. **Data final anterior à próxima dose:** a mensagem do servidor ("A data final é anterior à próxima dose", 422 `end_before_next_dose`) aparece no sheet de edição e no formulário de nova rotina, sem fechar nem perder o que foi digitado.
6. **Cache:** criar/editar/arquivar paciente e criar/editar/encerrar rotina atualizam a lista de pacientes, o detalhe, a lista de rotinas e a Hoje, sem recarregar à mão; trocar de conta não mostra pacientes da conta anterior.

---

### Task 1: Regras puras no `packages/shared`

**Files:**
- Move: `apps/api/src/lib/species.ts` → `packages/shared/src/species.ts`; `apps/api/src/lib/format.ts` → `packages/shared/src/format.ts`; as funções puras de `apps/api/src/lib/schedule.ts` usadas pelas telas (`INTERVAL_PRESETS`, `nextSlotAfter`) → `packages/shared/src/schedule.ts` (o restante de `schedule.ts` permanece na API e o importa do shared)
- Move: `apps/api/tests/{species,format}.test.ts` e os testes de `schedule.test.ts` dessas funções → `packages/shared/tests/`
- Modify: `packages/shared/src/index.ts`; os três arquivos da API viram re-exports nomeados de `@medicron/shared`
- Test: `packages/shared/tests/{species,format,schedule}.test.ts`

**Interfaces:**
- Produces (importáveis de `@medicron/shared`, assinaturas iguais às atuais): `Species`, `SPECIES: { value: Species; label: string }[]`, `speciesLabel(s: Species): string`; `initials(name: string): string`, `ageLabel(birthDate: string, now: Date): string`, `patientTone(name: string): number`; `INTERVAL_PRESETS: { label: string; minutes: number }[]`, `nextSlotAfter(anchor: Date, intervalMinutes: number, after: Date): Date`.

- [ ] **Step 1: Write the failing test** — mover os testes para `packages/shared/tests/` com imports de `../src/<módulo>`, e acrescentar: `ageLabel("2026-11-30", new Date("2026-11-08T12:00:00Z"))` (nascimento no futuro) devolve `"menos de 1 mês"` e não lança.
- [ ] **Step 2: Run** `npm test -w packages/shared`. Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** a mudança de lugar com `git mv` e os re-exports na API.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde; total de testes sem queda.
- [ ] **Step 5: Commit** `refactor: species, format e schedule (partes puras) no packages/shared`.

### Task 2: Dados de Pacientes e Rotinas (cliente, consultas e mutações)

**Files:**
- Create: `apps/app/src/lib/api/patients.ts`, `apps/app/src/lib/api/plans.ts`, `apps/app/src/lib/api/items.ts` (só `fetchItems`; o resto de itens é do 3C), `apps/app/src/lib/patient-queries.ts`
- Test: `apps/app/tests/patients-api.test.tsx`

**Interfaces:**
- Consumes: `ApiClient`, `ApiClientError` (Plano 2), `PatientBody`, `PlanCreateBody`, `PlanPatchBody`, `PatientDto`, `PlanDto`, `ItemDto` (shared).
- Produces:
  - `fetchPatients(client): Promise<PatientDto[]>`, `fetchPatient(client, id): Promise<PatientDto>`, `createPatient(client, body: PatientBody): Promise<PatientDto>`, `updatePatient(client, id, body): Promise<PatientDto>`, `archivePatient(client, id): Promise<void>`.
  - `fetchPlans(client, patientId): Promise<PlanDto[]>`, `createPlan(client, patientId, body: PlanCreateBody): Promise<PlanDto>`, `updatePlan(client, planId, body: PlanPatchBody): Promise<PlanDto>`, `deactivatePlan(client, planId): Promise<void>`; `fetchItems(client): Promise<ItemDto[]>`.
  - Hooks: `usePatients()`, `usePatient(id)` (chaves `["patients"]`, `["patient", id]`), `usePlans(patientId)` (`["plans", patientId]`), `useItems()` (`["items"]`), mutações `useCreatePatient/useUpdatePatient/useArchivePatient/useCreatePlan/useUpdatePlan/useDeactivatePlan`; todas invalidam `["patients"]`, `["patient"]`, `["plans"]` e `["home"]` conforme o caso (arquivar e encerrar invalidam também `["home"]`).

- [ ] **Step 1: Write the failing test** — com cliente falso: cada função monta método, caminho e corpo certos (`GET /patients`, `POST /patients/:id/plans`, `PATCH /plans/:id`, `DELETE /plans/:id`...); as respostas `{ patient }`/`{ plans }`/`{ plan }` são desembrulhadas; 404 vira `ApiClientError`; `useArchivePatient` e `useDeactivatePlan` invalidam `["home"]`; `useUpdatePlan` invalida `["plans"]` e `["home"]`; `useCreatePatient` invalida `["patients"]`.
- [ ] **Step 2: Run** `npm test -w apps/app -- patients-api`. Expected: FAIL.
- [ ] **Step 3: Implement** os módulos e os hooks (mesmo estilo de `home-queries.ts`; habilitar só com sessão).
- [ ] **Step 4: Run** `npm test -w apps/app -- patients-api`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): dados de pacientes, rotinas e itens (consultas e mutações)`.

### Task 3: Controles de formulário (Switch, Textarea, seletor de opções, data e data-hora, segmentado)

**Files:**
- Create: `apps/app/src/components/ui/switch.tsx`, `textarea.tsx`, `select-field.tsx` (campo que abre `MenuSheet` com as opções; na web usa `<select>` nativo em `select-field.web.tsx`), `date-field.tsx` (+ `date-field.web.tsx`, `<input type="date">`), `datetime-field.tsx` (+ `datetime-field.web.tsx`, `<input type="datetime-local">`), `segmented.tsx`
- Test: `apps/app/tests/form-controls.test.tsx`

**Interfaces:**
- Produces:
  - `Switch({ value: boolean; onValueChange(v: boolean); accessibilityLabel })` — alvo ≥ 44 px, cores `primary`/`input`.
  - `Textarea` — como `Input`, multilinha (`min-h-20`), `maxLength`.
  - `SelectField({ value: string; onChange(v: string); options: { value: string; label: string; group?: string }[]; placeholder?: string; accessibilityLabel? })` — mostra o rótulo da opção (ou o placeholder) com `ChevronDown`; toque abre sheet com as opções (agrupadas por `group`), marca a selecionada.
  - `DateField({ value: string /* YYYY-MM-DD ou "" */; onChange(v: string); accessibilityLabel? })` e `DateTimeField({ value: string /* YYYY-MM-DDTHH:mm de Brasília ou "" */; onChange(v: string); accessibilityLabel? })` — iOS: `DateTimePicker` compacto (data, ou data+hora em dois seletores); Android: botão que abre o seletor nativo (`DateTimePickerAndroid`), data e depois hora; vazio mostra "Selecionar"; um "Limpar" quando opcional (`clearable`). O valor trafega como texto sem fuso (relógio de Brasília), igual a `toLocalInput`/`parseLocalInput` do shared.
  - `Segmented({ items: { key: string; label: string }[]; value: string; onChange(key: string); accessibilityLabel })` — "Seções do paciente": trilho `bg-muted` com itens `h-11`, o ativo em `bg-card` com sombra, `accessibilityRole="tab"` e `selected`.

- [ ] **Step 1: Write the failing tests** — `Switch` alterna e expõe `accessibilityState.checked`; `SelectField` abre o sheet, escolher chama `onChange` com o valor e fecha, mostra placeholder quando vazio e agrupa por `group`; `DateField` e `DateTimeField` (seletor nativo simulado como no 3A) devolvem `YYYY-MM-DD` / `YYYY-MM-DDTHH:mm` a partir dos campos locais do aparelho e "Limpar" devolve `""`; `Segmented` marca o ativo e chama `onChange`.
- [ ] **Step 2: Run** `npm test -w apps/app -- form-controls`. Expected: FAIL.
- [ ] **Step 3: Implement** os componentes (mock do `DateTimePicker` no jest como em `resolve-buttons.test.tsx`).
- [ ] **Step 4: Run** os testes e `npx expo export -p web` em `apps/app` (valida os `.web.tsx`). Expected: PASS; export sem erro.
- [ ] **Step 5: Commit** `feat(app): controles de formulário (switch, texto longo, seletor, data e data-hora, segmentado)`.

### Task 4: Peças das telas de paciente (cabeçalho com voltar, cartão, formulário, confirmação)

**Files:**
- Modify: `apps/app/src/components/page-header.tsx` (props `onBack?`, `actions?`)
- Create: `apps/app/src/components/{add-button,species-icon,patient-card,list-row,confirm-sheet}.tsx`, `apps/app/src/components/patient-form.tsx`
- Test: `apps/app/tests/patient-parts.test.tsx`

**Interfaces:**
- Consumes: T1 (`speciesLabel`, `ageLabel`, `patientTone`, `SPECIES`), T3 (controles), `Drawer`, `Avatar`, `Button`, `FormField`, `Input` (Planos 2/3A), `toast`.
- Produces:
  - `PageHeader({ title, description?, onBack?, actions? })` — com `onBack` mostra o botão "Voltar" (`size-11`, ícone `ChevronLeft`).
  - `AddButton({ label, onPress })` — botão com `Plus` e rótulo; `SpeciesIcon({ species, color? })` (Cat, Dog, User, PawPrint).
  - `PatientCard({ patient: PatientDto, onPress })` — avatar `size-12` com o ícone da espécie e a cor `patientTone`, nome, "espécie · idade · peso kg" (peso com vírgula) e `ChevronRight`; alvo da linha inteira.
  - `ListRow({ icon, title, subtitle?, onPress?, trailing?, children? })` — linha de lista do site (com `onPress` vira toque com seta).
  - `ConfirmSheet({ open, onOpenChange, title, description, confirmLabel, onConfirm(): Promise<void> | void })` — sheet com "Cancelar" e botão destrutivo (`confirmLabel`, "Aguarde…" enquanto executa); toque duplo executa uma vez; fecha ao concluir; se `onConfirm` lançar, mantém aberto e mostra `toast.error`.
  - `PatientForm({ patient?: PatientDto; onSubmit(body: PatientBody): Promise<void>; submitting? })` — campos Nome (obrigatório, máx. 60), Tipo (`SelectField`, "Selecione…", obrigatório), Nascimento (`DateField`, "Opcional") e Peso (kg) (`inputMode="decimal"`, placeholder "4,2", "Opcional") lado a lado em tela larga e empilhados no celular, Observações (`Textarea`, dica "Opcional: alergias, condições, responsável…"), botão "Salvar" (desabilita enquanto envia). Validação no cliente: nome vazio ("Informe o nome"), tipo vazio ("Selecione o tipo"), peso inválido ou fora de (0, 500] ("Peso inválido"); o peso com vírgula vira número; campos opcionais vazios não vão no corpo.

- [ ] **Step 1: Write the failing tests** — `PatientCard`: meta "Gato · 6 meses · 4,2 kg", sem nascimento e peso mostra só a espécie, toque chama `onPress`; `PageHeader` com e sem `onBack`; `ConfirmSheet`: confirmar chama `onConfirm` uma vez mesmo com dois toques, cancelar fecha sem chamar, erro mantém aberto com toast; `PatientForm`: submit com nome e tipo envia `{name, species}` sem campos vazios, `"4,2"` vira `4.2`, peso `"abc"`, `"0"` e `"501"` mostram "Peso inválido" e não enviam, nome em branco e tipo vazio mostram os erros, editar mostra os valores atuais e botão desabilitado durante o envio.
- [ ] **Step 2: Run** `npm test -w apps/app -- patient-parts`. Expected: FAIL.
- [ ] **Step 3: Implement** os componentes.
- [ ] **Step 4: Run** `npm test -w apps/app -- patient-parts shell`. Expected: PASS (o `PageHeader` novo não quebra os usos do 3A).
- [ ] **Step 5: Commit** `feat(app): cartão de paciente, formulário, linha de lista e confirmação`.

### Task 5: Telas Lista de pacientes e Novo paciente

**Files:**
- Create: `apps/app/src/app/(app)/pacientes/_layout.tsx` (`Stack` sem cabeçalho nativo), `pacientes/index.tsx` (substitui `(app)/pacientes.tsx`, que é removido), `pacientes/novo.tsx`
- Test: `apps/app/tests/patients-screens.test.tsx`

**Interfaces:**
- Consumes: T2 (`usePatients`, `useCreatePatient`), T4, `Screen`, `EmptyState`, `ErrorView`, `Skeleton`, `useRouter`.
- Produces:
  - Lista: `PageHeader` "Pacientes" com a descrição `"{n} paciente(s) nesta conta"` (singular "1 paciente nesta conta") e `AddButton` "Novo paciente"; vazio: `EmptyState` "Nenhum paciente cadastrado" / "Cadastre o primeiro para montar a rotina de cuidados." com o mesmo botão; carregando: esqueleto; erro: `ErrorView`; puxar para atualizar; `PatientCard` leva a `/pacientes/<id>`.
  - Novo: `PageHeader` "Novo paciente" com voltar (`/pacientes`) e `PatientForm`; ao salvar vai para `/pacientes/<id>` (substitui a rota) com `toast.success("Salvo")`; erro de rede/servidor vira `toast.error` com a mensagem e mantém o formulário preenchido.

- [ ] **Step 1: Write the failing tests** — lista: carregando/erro/vazio/com 1 e com 3 pacientes (textos exatos), toque no cartão navega, botão "Novo paciente" navega a `/pacientes/novo`; novo: submissão válida chama `createPatient` e navega ao detalhe, erro da API mantém os campos e avisa, voltar navega à lista.
- [ ] **Step 2: Run** `npm test -w apps/app -- patients-screens shell`. Expected: FAIL.
- [ ] **Step 3: Implement** as rotas; atualizar `screens.test.tsx` (a tela provisória de Pacientes sai da lista).
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): lista de pacientes e novo paciente`.

### Task 6: Detalhe do paciente (Dados e Rotina)

**Files:**
- Create: `apps/app/src/app/(app)/pacientes/[id]/index.tsx`, `apps/app/src/components/{edit-plan-sheet,plan-row}.tsx`
- Test: `apps/app/tests/patient-detail.test.tsx`

**Interfaces:**
- Consumes: T2, T3 (`Segmented`), T4 (`PageHeader`, `ListRow`, `ConfirmSheet`, `PatientForm`, `AddButton`), `Drawer`, `Switch`, `DateTimeField`, `Badge`, `EmptyState`, `intervalLabel`, `formatDateTime`, `nextSlotAfter`, `toLocalInput`, `parseLocalInput` (shared), `useLocalSearchParams<{ aba?: string }>`.
- Produces:
  - Tela `[id]`: `PageHeader` com o nome, a espécie por extenso, voltar para `/pacientes` e, na aba Rotina, `AddButton` "Adicionar" (leva a `/pacientes/<id>/rotina/nova`); `Segmented` "Seções do paciente" com "Dados" e "Rotina" (padrão Rotina; `aba=dados` na rota). Aba Dados: `PatientForm` de edição (salva, `toast.success("Salvo")`, fica na aba) e botão "Arquivar paciente" (`size lg`, largura total) que abre `ConfirmSheet` "Arquivar `{nome}`?" / "O paciente some das listas e todas as rotinas dele são encerradas." / "Arquivar"; ao confirmar, volta para `/pacientes`. Aba Rotina: sem rotinas `EmptyState` "Sem rotina ainda" / "Associe uma medicação ou procedimento e defina a frequência." com "Adicionar"; com rotinas, `PlanRow` por rotina. Carregando: esqueleto; 404: `EmptyState` "Paciente não encontrado" / "Ele pode ter sido arquivado." com botão "Ver pacientes".
  - `PlanRow({ plan: PlanDto, patientName })`: `ListRow` com ícone (estetoscópio para procedimento, pílula para medicação), nome do item, dose, selo `Badge secondary` com `intervalLabel`, "próxima `formatDateTime(nextSlotAfter(anchorAt, intervalMinutes, agora))`", botão de ícone "Editar" (abre `EditPlanSheet`) e botão de ícone "Encerrar" (abre `ConfirmSheet` "Encerrar `{item}`?" / "Os lembretes de `{item}` para `{paciente}` serão interrompidos. O histórico é mantido." / "Encerrar rotina").
  - `EditPlanSheet({ plan, patientName, open, onOpenChange })`: `Drawer` com título = item, "`{paciente}` · editar rotina", campos "Dose / instrução" (dica "Opcional.", máx. 120), "Data final" (`DateTimeField` clearable, dica "Opcional. Deixe vazio para um uso contínuo.", mostra o valor atual em horário de Brasília), switch "Reprogramar horários" com o texto "Se uma dose atrasar, as próximas acompanham a hora real da aplicação."; "Cancelar" e "Salvar"; sucesso `toast.success("Rotina atualizada")` e fecha; erro 422 `end_before_next_dose` mostra a mensagem do servidor com `toast.error`, mantém aberto e o que foi digitado. Dose em branco envia `null`; data final vazia envia `null`.

- [ ] **Step 1: Write the failing tests** — cabeçalho e abas (padrão Rotina; `aba=dados` abre Dados; trocar de aba muda o parâmetro); lista de rotinas com selo, dose e "próxima" (relógio fixo); vazio da rotina; `Adicionar` navega; editar paciente chama `updatePatient` e avisa; arquivar pede confirmação, chama `archivePatient` uma vez com dois toques e navega a `/pacientes`; editar rotina envia `{dose, endAt, reschedule}` (data final de Brasília → UTC certo, vazios → `null`), 422 mantém aberto e mostra a mensagem, sucesso avisa e fecha; encerrar rotina pede confirmação e chama `deactivatePlan`; 404 mostra "Paciente não encontrado".
- [ ] **Step 2: Run** `npm test -w apps/app -- patient-detail`. Expected: FAIL.
- [ ] **Step 3: Implement** a tela e os dois componentes.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): detalhe do paciente, edição, arquivar e rotinas`.

### Task 7: Nova rotina

**Files:**
- Create: `apps/app/src/app/(app)/pacientes/[id]/rotina/nova.tsx`, `apps/app/src/components/plan-form.tsx`
- Test: `apps/app/tests/plan-form.test.tsx`

**Interfaces:**
- Consumes: T2 (`usePatient`, `useItems`, `useCreatePlan`), T3, T4, `INTERVAL_PRESETS`, `nextQuarterHourInput`, `parseLocalInput` (shared), `FormField`, `Input`.
- Produces:
  - `PlanForm({ items: ItemDto[]; defaultAnchor: string; onSubmit(body: PlanCreateBody): Promise<void> })`: três seções com legenda ("O quê", "Quando", "Até quando") em cartão `rounded-2xl border bg-card p-4`. O quê: "Medicação ou procedimento" (`SelectField` agrupado em "Medicações" e "Procedimentos", "Selecione…", obrigatório) e "Dose / instrução" (dica "Opcional. Se vazio, usa a dose padrão do item.", máx. 120). Quando: "Frequência" (`SelectField` com `INTERVAL_PRESETS` e "Personalizada…", padrão "A cada 8 horas"), "Se personalizada: a cada quantas horas?" (dica "Ex.: 5", decimal com vírgula), "Horário da primeira dose" (`DateTimeField`, dica "Horário de Brasília. Os próximos seguem a frequência a partir daqui.", obrigatório, padrão `defaultAnchor`) e o switch "Reprogramar horários". Até quando: "Data final" (`DateTimeField` clearable, dica "Opcional. Deixe vazio para um uso contínuo."). Botão "Salvar rotina". Validação: item vazio ("Selecione o item"); "Personalizada" sem horas válidas, `< 5 min` ou `> 1 ano` ("Informe um intervalo entre 5 minutos e 1 ano"); horas com vírgula (`"1,5"` = 90). O corpo leva `anchorAt`/`endAt` em ISO (de Brasília para UTC), `dose` só se preenchida, `reschedule` booleano.
  - Tela: `PageHeader` "Nova rotina" com a descrição = nome do paciente e voltar; sem itens, `EmptyState` "Cadastre um item primeiro" / "Você precisa de ao menos uma medicação ou procedimento para montar a rotina." com botão "Cadastrar item" (`/itens/novo`); com itens, o `PlanForm`; ao salvar volta ao detalhe (`/pacientes/<id>`) com `toast.success("Salvo")` e a rotina nova na lista; 422 de data final mostra a mensagem do servidor e mantém o formulário preenchido; paciente 404 igual ao detalhe.

- [ ] **Step 1: Write the failing tests** — campos, grupos e padrões; envio válido com preset (corpo exato, `anchorAt` de Brasília em UTC); personalizada `"1,5"` envia 90, `""`, `"abc"`, `"0.05"` e `"9000"` mostram o erro e não enviam; item vazio mostra "Selecione o item"; `reschedule` e `endAt` vão quando ligados/preenchidos; 422 mantém o formulário e mostra a mensagem; sem itens mostra o vazio e o botão navega; sucesso navega ao detalhe.
- [ ] **Step 2: Run** `npm test -w apps/app -- plan-form`. Expected: FAIL.
- [ ] **Step 3: Implement** o formulário e a tela.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `npx expo export -p ios` em `apps/app`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): nova rotina`.

### Task 8: Conferência contra o site e aprovação (com o usuário)

**Files:** nenhum arquivo de código (capturas fora do repositório).

- [ ] **Step 1: Rodar** o app no simulador (`EXPO_PUBLIC_API_URL=https://medicron.com.br npx expo start --ios`) com a conta do usuário (login feito **pelo usuário**).
- [ ] **Step 2: Verificar** no aparelho, com o usuário: lista, novo paciente (espécie, nascimento, peso com vírgula), editar, arquivar (use um paciente de teste), nova rotina (preset, personalizada, data final, reprogramar), editar e encerrar rotina, teclado nos formulários em iPhone pequeno, claro e escuro, e os seletores nativos de data e hora.
- [ ] **Step 3: Capturas lado a lado** com `https://medicron.com.br` (celular e desktop, claro e escuro) de Lista, Novo, Detalhe (Dados e Rotina), Nova rotina, sheet de edição e de confirmação. Ajustar com teste o que destoar.
- [ ] **Step 4: Mostrar** as capturas ao usuário e só seguir com a aprovação dele; ajustes pedidos entram como correções com teste.

### Task 9: Fechamento do Plano 3B

**Files:**
- Modify: `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3: Pacientes e Rotinas concluídas), `README.md` (estado do app)

- [ ] **Step 1: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 2: Revisão final** da branch por um revisor independente (modelo mais capaz); corrigir Critical e Important com teste antes; Minor ao ledger.
- [ ] **Step 3: Publicar** `vercel --prod --yes` (a API mudou só por re-exports) e conferir `/entrar` e `/api/v1/config` em `https://medicron.com.br`.
- [ ] **Step 4: Atualizar** o documento de design e o README, e commitar `docs: Plano 3B concluído (pacientes e rotinas)`.
