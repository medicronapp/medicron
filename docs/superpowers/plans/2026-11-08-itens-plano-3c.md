# Plano 3C — Itens (paridade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** As telas de Itens do app Expo com a mesma aparência, textos e comportamento do site: lista com as abas Medicações e Procedimentos, novo item, e detalhe com edição e arquivamento.

**Architecture:** Leituras e mutações pela API v1 já existente (`/items`, `/items/:id`) via TanStack Query, no mesmo molde de Pacientes (3B). Reaproveita `ListRow`, `PageHeader`, `Segmented`, `ConfirmSheet`, `FormSection`, `FormField`, `Input`, `Textarea`, `AddButton`, `Screen`, `EmptyState` e `ErrorView`. Navegação com `Stack` dentro de `(app)/itens`.

**Tech Stack:** Expo SDK 58, NativeWind 5 RC, `@tanstack/react-query`, jest-expo. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3; escolhas 12 e 14). Base: Planos 2, 3A e 3B, já em `main`.

## Global Constraints

- Textos em pt-BR **iguais** aos do site (copiar de `apps/api/src/app/(app)/itens/**` e `apps/api/src/components/{item-card,item-form}.tsx`). Sem regra de negócio nova.
- Alvos de toque ≥ 44 px; contraste AA; estados e erros nunca só por cor.
- Sem cookies, senhas ou corpo de requisição em log.
- Sem dependências novas.
- TDD em cada tarefa; `npm test` da raiz fica verde; typecheck, lint e `expo export -p web` e `-p ios` limpos.
- Rotas novas dentro de `(app)/itens/` (`_layout` com `Stack` de fundo opaco do tema, `index`, `novo`, `[id]`); o item "Itens" da barra continua ativo em todas (`isActive` por segmento). A tela provisória `(app)/itens.tsx` é removida.
- Cada tela mostra: esqueleto ao carregar (`accessibilityLabel="Carregando"`), `ErrorView` com "Tentar de novo" em erro, e "Item não encontrado" / "Ele pode ter sido arquivado." (botão "Ver itens") em 404.
- Feedback de salvar: `toast.success("Salvo")` e volta à lista do tipo do item (o site redireciona para `/itens?tipo=<tipo>`).
- Formulário em seções em cartão (`FormSection`), como Pacientes e Nova rotina: "O que é" (Tipo e Nome) e "Detalhes" (Dose/instrução padrão e Observações) — títulos escolhidos por mim.
- Tipo do item (2 opções) usa `Segmented` ("Medicação" / "Procedimento") dentro do campo, em vez do sheet de cartões (com 2 opções o cartão em 3 colunas ficaria com um terço vazio). Decisão minha.
- Cache: criar/editar/arquivar item invalidam todas as listas de itens (as duas abas e a lista completa usada em Nova rotina); arquivar também invalida rotinas, pacientes e a Hoje (as rotinas que usam o item são encerradas) e remove o detalhe do item arquivado do cache.

## Review Focus

1. **Tipo do item:** trocar Medicação ↔ Procedimento na edição move o item de uma aba para a outra (as duas listas se atualizam); `tipo` inválido na rota cai em Medicações; o tipo da aba atual vem preenchido em "Novo".
2. **Nome e campos opcionais:** nome em branco ("Informe o nome"), só espaços, máximo de 80; dose (120) e observações (1000) em branco não vão no corpo; editar e apagar o texto de um campo opcional **limpa** o valor no servidor: o `PATCH /items/:id` substitui o item (campo omitido vira `null`), então o app deve mandar o corpo completo e omitir os vazios; teste de tela cobre "apagar a dose padrão envia o corpo sem `defaultDose`".
3. **Arquivar:** toque duplo executa uma vez; rotinas que usam o item somem da aba Rotina do paciente e da Hoje sem recarregar à mão; voltar não mostra o detalhe antigo; 404 mostra o estado de "não encontrado".
4. **Criar item a partir de Nova rotina:** o botão "Cadastrar item" (estado "Cadastre um item primeiro") agora abre "Novo item"; ao salvar e voltar para Nova rotina, o item já aparece no seletor, sem recarregar.
5. **Troca de conta:** a lista de itens da conta anterior não aparece (o `resetAccountData` do 3B já remove `["items"]` e `["item", id]`; garantir com teste).

---

### Task 1: Dados de Itens (cliente, consultas e mutações)

**Files:**
- Modify: `apps/app/src/lib/api/items.ts` (estende `fetchItems` e acrescenta o resto), `apps/app/src/lib/patient-queries.ts` (`useItems` passa a aceitar o tipo)
- Create: `apps/app/src/lib/item-queries.ts`
- Test: `apps/app/tests/items-api.test.tsx`

**Interfaces:**
- Consumes: `ApiClient`, `ItemBody`, `ItemDto` (shared), `useAppSession`.
- Produces:
  - `fetchItems(client, kind?: "medication" | "procedure"): Promise<ItemDto[]>` (`GET /items` e `GET /items?kind=<kind>`), `fetchItem(client, id)`, `createItem(client, body: ItemBody)`, `updateItem(client, id, body)`, `archiveItem(client, id)`.
  - Hooks em `item-queries.ts`: `useItems(kind?)` (chave `["items", kind ?? "all"]`), `useItem(id)` (`["item", id]`), `useCreateItem()`, `useUpdateItem()` (`{ id, body }`), `useArchiveItem()` (`id`). `useItems` sai de `patient-queries.ts` e é re-exportado de lá para não quebrar a Nova rotina.
  - Invalidação: criar/editar → prefixo `["items"]` (e `["item"]` ao editar); arquivar → `removeQueries(["item", id])` e invalida `["items"]`, `["plans"]`, `["patients"]`, `["patient"]` e `["home"]`.

- [ ] **Step 1: Write the failing test** — com cliente falso: `fetchItems` sem e com tipo monta `/items` e `/items?kind=procedure`; `fetchItem` desembrulha `{ item }`; `createItem`/`updateItem` usam `POST /items` e `PATCH /items/:id` com o corpo e desembrulham; `archiveItem` usa `DELETE /items/:id`; 404 vira `ApiClientError`; `useCreateItem` invalida `["items"]`; `useUpdateItem` invalida `["items"]` e `["item"]`; `useArchiveItem` remove `["item", id]` do cache e invalida itens, rotinas, pacientes e Hoje; `useItems("procedure")` usa a chave `["items", "procedure"]`.
- [ ] **Step 2: Run** `npm test -w apps/app -- items-api`. Expected: FAIL.
- [ ] **Step 3: Implement** os módulos (mesmo estilo de `patient-queries.ts`; habilitar só com sessão).
- [ ] **Step 4: Run** `npm test -w apps/app -- items-api patients-api`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): dados de itens (consultas e mutações)`.

### Task 2: Cartão de item e formulário de item

**Files:**
- Create: `apps/app/src/components/item-card.tsx`, `apps/app/src/components/item-form.tsx`
- Test: `apps/app/tests/item-parts.test.tsx`

**Interfaces:**
- Consumes: `ListRow`, `FormSection`, `FormField`, `Input`, `Textarea`, `Segmented`, `Button` (Planos 2 a 3B), `ItemDto`, `ItemBody`.
- Produces:
  - `ItemCard({ item: ItemDto, onPress })`: `ListRow` com ícone (estetoscópio para procedimento, pílula para medicação), nome e subtítulo `"Procedimento"` ou `"Medicação"` seguido de ` · <dose padrão>` quando houver.
  - `ItemForm({ item?: ItemDto; defaultKind?: "medication" | "procedure"; onSubmit(body: ItemBody): Promise<void>; submitting? })`: seção "O que é" com "Tipo" (`Segmented`: "Medicação" / "Procedimento", padrão `item.kind ?? defaultKind ?? "medication"`) e "Nome" (obrigatório, máx. 80, dica "Ex.: Amoxicilina, Medir temperatura, Limpar olho esquerdo"); seção "Detalhes" com "Dose / instrução padrão" (máx. 120, dica "Opcional. Ex.: 1/2 comprimido, 0,5 ml") e "Observações" (`Textarea`, máx. 1000, dica "Opcional"); botão "Salvar" (desabilitado e com spinner enquanto envia). Validação: nome em branco ou só espaços mostra "Informe o nome" e não envia; campos opcionais em branco não vão no corpo; os valores vão aparados (`trim`).

- [ ] **Step 1: Write the failing test** — `ItemCard`: subtítulo "Medicação · 1/2 comprimido", "Procedimento" sem dose, toque chama `onPress`; `ItemForm`: padrões do tipo (por `defaultKind` e por `item`), trocar o tipo muda o corpo, nome vazio e só espaços mostram o erro e não enviam, corpo mínimo `{ name, kind }`, dose e observações aparadas vão no corpo, dicas exatas, editar mostra os valores atuais, botão desabilitado durante o envio.
- [ ] **Step 2: Run** `npm test -w apps/app -- item-parts`. Expected: FAIL.
- [ ] **Step 3: Implement** os dois componentes.
- [ ] **Step 4: Run** `npm test -w apps/app -- item-parts`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): cartão de item e formulário de item`.

### Task 3: Lista de itens e Novo item

**Files:**
- Create: `apps/app/src/app/(app)/itens/_layout.tsx` (`Stack` com fundo opaco do tema, igual ao de pacientes), `itens/index.tsx` (substitui `(app)/itens.tsx`, que é removido), `itens/novo.tsx`
- Test: `apps/app/tests/items-screens.test.tsx`; ajustar `apps/app/tests/screens.test.tsx` (a tela provisória de Itens sai) e `apps/app/tests/stack-background.test.tsx` (cobre também o layout de itens)

**Interfaces:**
- Consumes: T1 (`useItems`, `useCreateItem`), T2, `PageHeader`, `Segmented`, `AddButton`, `EmptyState`, `ErrorView`, `Screen`, `Skeleton`, `toast`, `useLocalSearchParams<{ tipo?: string }>`.
- Produces:
  - Lista: `PageHeader` "Itens" / "Medicações e procedimentos que entram nas rotinas." com `AddButton` "Novo" (leva a `/itens/novo?tipo=<tipo atual>`); `Segmented` "Tipo de item" com "Medicações" e "Procedimentos" (padrão Medicações; `tipo=procedure` abre Procedimentos; valor inválido cai em Medicações; trocar muda o parâmetro com `router.setParams`); vazio por aba: `EmptyState` "Nenhuma medicação" / "Ex.: antibiótico, anti-inflamatório, vitamina." ou "Nenhum procedimento" / "Ex.: medir temperatura, limpar um ferimento." (ícone pílula/estetoscópio) com o mesmo botão "Novo"; com itens, `ItemCard` leva a `/itens/<id>`; puxar para atualizar.
  - Novo: `PageHeader` "Novo item" com voltar (`/itens?tipo=<tipo>`) e `ItemForm` com `defaultKind` = `tipo` da rota (inválido → medicação); ao salvar, `toast.success("Salvo")` e volta a `/itens?tipo=<tipo do item criado>` com `router.navigate`; erro mantém o formulário preenchido e avisa com `toast.error`.

- [ ] **Step 1: Write the failing test** — lista: carregando/erro/vazio nas duas abas (textos exatos)/com itens, abas trocam o parâmetro e `tipo` inválido cai em Medicações, "Novo" leva a `/itens/novo?tipo=procedure` na aba Procedimentos, toque no cartão abre `/itens/<id>`, puxar para atualizar; novo: `defaultKind` vem da rota, salvar chama `createItem`, avisa e volta à lista do tipo do item criado (criar um procedimento estando na aba Medicações volta à aba Procedimentos), erro mantém os campos, voltar navega à lista.
- [ ] **Step 2: Run** `npm test -w apps/app -- items-screens stack-background`. Expected: FAIL.
- [ ] **Step 3: Implement** as rotas; remover `(app)/itens.tsx`.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): lista de itens e novo item`.

### Task 4: Detalhe do item (editar e arquivar)

**Files:**
- Create: `apps/app/src/app/(app)/itens/[id].tsx`
- Test: `apps/app/tests/item-detail.test.tsx`

**Interfaces:**
- Consumes: T1 (`useItem`, `useUpdateItem`, `useArchiveItem`), T2 (`ItemForm`), `PageHeader`, `ConfirmSheet`, `Button`, `EmptyState`, `ErrorView`, `Screen`, `Skeleton`, `toast`.
- Produces: tela `[id]`: `PageHeader` com o nome do item e voltar para `/itens?tipo=<tipo do item>`; `ItemForm` de edição (salvar envia o corpo, avisa `toast.success("Salvo")` e volta a `/itens?tipo=<tipo salvo>`); botão "Arquivar item" (`size lg`, largura total, destrutivo) abre `ConfirmSheet` "Arquivar `{nome}`?" / "O item some das listas e as rotinas que o usam são encerradas." / "Arquivar"; ao confirmar, executa uma vez (toque duplo) e volta a `/itens?tipo=<tipo do item>`. Carregando: esqueleto; 404: `EmptyState` "Item não encontrado" / "Ele pode ter sido arquivado." com "Ver itens" (`/itens`); outro erro: `ErrorView`.

- [ ] **Step 1: Write the failing test** — cabeçalho e voltar (ao tipo do item); carregando; 404; outro erro com "Tentar de novo"; editar envia o corpo certo e volta à lista do tipo salvo (trocar o tipo na edição volta à aba do novo tipo); erro do servidor mantém o formulário e avisa; arquivar pede confirmação, executa uma vez com dois toques e volta à lista do tipo; erro ao arquivar mantém o sheet e avisa.
- [ ] **Step 2: Run** `npm test -w apps/app -- item-detail`. Expected: FAIL.
- [ ] **Step 3: Implement** a tela.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `-p ios` em `apps/app`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): detalhe do item, edição e arquivar`.

### Task 5: Conferência contra o site e aprovação (com o usuário)

**Files:** nenhum arquivo de código (capturas fora do repositório).

- [ ] **Step 1: Rodar** o app no simulador (`EXPO_PUBLIC_API_URL=https://medicron.com.br npx expo start --ios`) com a conta do usuário (login feito **pelo usuário**).
- [ ] **Step 2: Verificar** no aparelho, com o usuário: as duas abas, criar uma medicação e um procedimento, editar (inclusive trocar o tipo e apagar a dose padrão), arquivar um item de teste (e ver a rotina que o usava sumir do paciente e da Hoje), criar um item a partir de Nova rotina e voltar, teclado nos formulários, claro e escuro.
- [ ] **Step 3: Capturas lado a lado** com `https://medicron.com.br` (celular e desktop, claro e escuro) de Lista (as duas abas, com e sem itens), Novo e Detalhe. Ajustar com teste o que destoar.
- [ ] **Step 4: Mostrar** as capturas ao usuário e só seguir com a aprovação dele; ajustes pedidos entram como correções com teste.

### Task 6: Fechamento do Plano 3C

**Files:**
- Modify: `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3: Itens concluídos), `README.md` (estado do app)

- [ ] **Step 1: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 2: Revisão final** da branch por um revisor independente (modelo mais capaz); corrigir Critical e Important com teste antes; Minor ao ledger.
- [ ] **Step 3: Publicar** `vercel --prod --yes` (a API não muda neste plano; o deploy só confirma que continua tudo no ar) e conferir `/entrar` e `/api/v1/config` em `https://medicron.com.br`.
- [ ] **Step 4: Atualizar** o documento de design e o README, e commitar `docs: Plano 3C concluído (itens)`.
