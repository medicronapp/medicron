# Plano 3D — Conta e convites (paridade) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A tela Conta (pessoas, convidar alguém, convites pendentes, aparência) e a tela de convite do app Expo com a mesma aparência, textos e comportamento do site, fechando a Etapa 3 (paridade por tela).

**Architecture:** Organização, membros e convites vêm do cliente do `better-auth` (`useActiveOrganization`, `organization.inviteMember/cancelInvitation/getInvitation/acceptInvitation/setActive`), que já se atualiza sozinho a cada ação de organização; o papel do usuário vem de `/me`. O tema manual (Claro/Escuro/Sistema) usa `Appearance.setColorScheme` no nativo, com a preferência guardada no aparelho. A tela de convite é uma rota da raiz (`/convite/[id]`), aberta também por `medicron://convite/<id>`.

**Tech Stack:** Expo SDK 58, NativeWind 5 RC, `@tanstack/react-query`, `better-auth` (cliente), `expo-clipboard` (novo, versão do `expo install`), `expo-secure-store` (já instalado), jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3; escolhas 12, 14 e 15). Base: Planos 2, 3A, 3B e 3C, já em `main`.

## Global Constraints

- Textos em pt-BR **iguais** aos do site (copiar de `apps/api/src/app/(app)/conta/page.tsx`, `apps/api/src/app/convite/[id]/page.tsx` e `apps/api/src/components/{appearance-card,member-row,invitation-row,invite-form,accept-invite}.tsx`). Sem regra de negócio nova.
- Alvos de toque ≥ 44 px; contraste AA; estados e erros nunca só por cor.
- Sem cookies, senhas ou corpo de requisição em log; o link de convite não vai para log.
- Versões novas fixadas exatas (`npx expo install` e remover `^`/`~`).
- TDD em cada tarefa; `npm test` da raiz fica verde; typecheck, lint e `expo export -p web` e `-p ios` limpos.
- O aviso de notificações (`EnableNotifications`) **não** entra nesta tela: é do Plano 4 (push). O passo "Ativar os avisos no celular" da Hoje continua levando a `/conta`.
- Links de convite usam o endereço da API de produção (`API_URL`, hoje `https://medicron.com.br`), com a mesma forma do site (`/convite/<id>`): abrem a página web de convite; os links universais (abrir direto no app) são da Etapa 5.
- Telas rolam dentro do `Screen`; carregando = esqueleto (`accessibilityLabel="Carregando"`); erro = `ErrorView` com "Tentar de novo".
- O `inviteLink` do site (`apps/api/src/lib/invites.ts`) vai para `packages/shared` (a API o re-exporta).

## Review Focus

1. **Convidado sem conta:** quem cria a conta pelo link de convite não ganha "Casa de …" (o cadastro pula essa etapa) e fica com **0 contas**; a guarda de rotas **não** pode mandá-lo para "Nova conta" antes de aceitar o convite. Sem sessão, o link leva a **Criar conta** (como o site), voltando ao convite depois.
2. **Aceitar o convite:** a conta nova vira a ativa, a lista de contas do cabeçalho atualiza (o `better-auth` não avisa a lista nesse caso), o cache da conta anterior some e o usuário cai na Hoje; convite expirado, cancelado, já usado ou de outro e-mail mostra "Convite indisponível"; aceitar com erro mostra a mensagem do site e destrava o botão.
3. **Quem pode convidar:** só dono e administrador veem "Convidar alguém" e "Convites pendentes"; membro vê só as pessoas e a aparência; o papel vem de `/me` e não pisca o formulário errado enquanto carrega.
4. **Convidar e cancelar:** e-mail vazio ou inválido não envia; duplo toque gera um convite só; o link gerado aparece com "Copiar"; cancelar pede confirmação, atualiza a lista de pendentes e o link antigo deixa de valer; erros mostram as mensagens do site.
5. **Tema manual:** a escolha persiste ao fechar o app, vale já na abertura (sem piscar o tema errado) e muda também as cores de ícones e SVG (que vêm de `useColors`); "Sistema" volta a seguir o aparelho; na web, ou funciona de verdade ou o cartão fica fora (decisão da Tarefa 1, registrada na spec).

---

### Task 1: Aparência (tema manual) — verificação e implementação

**Files:**
- Create: `apps/app/src/lib/theme-pref.ts` (nativo, `expo-secure-store`) e `apps/app/src/lib/theme-pref.web.ts` (`localStorage`), `apps/app/src/components/appearance-card.tsx`
- Modify: `apps/app/src/app/_layout.tsx` (aplica a preferência antes de tirar a tela de abertura), `apps/app/src/global.css` e `apps/app/scripts/sync-tokens.ts` **somente se** a verificação da web exigir
- Test: `apps/app/tests/appearance.test.tsx`

**Interfaces:**
- Produces:
  - `type ThemePref = "light" | "dark" | "system"`; `loadThemePref(): Promise<ThemePref>` (padrão `"system"`; valor guardado inválido → `"system"`), `saveThemePref(pref: ThemePref): Promise<void>`, `applyThemePref(pref: ThemePref): void` (nativo: `Appearance.setColorScheme(pref === "system" ? null : pref)`).
  - `AppearanceCard()`: grupo "Tema do aplicativo" com 3 opções em cartões `h-16` ("Claro" sol, "Escuro" lua, "Sistema" monitor), a escolhida em `border-primary bg-brand-soft`, `accessibilityRole="radio"` com `selected`; tocar aplica na hora e guarda.
  - O layout raiz carrega a preferência junto com as fontes e a aplica **antes** de esconder a tela de abertura.

- [ ] **Step 1: Verificar a web (spike, sem código de produto)** — com o app web e o Chrome, trocar `prefers-color-scheme` não é possível pela página; checar no código instalado (`react-native-css`, runtime web) se o modo escuro da web responde a `Appearance.setColorScheme`/`colorScheme.set`. Registrar o resultado no ledger como `Ruling:`. Saídas possíveis: (a) a web obedece → implementar igual ao nativo; (b) a web só obedece ao navegador → o `AppearanceCard` fica **fora da web** (`Platform.OS === "web"` não renderiza) e a spec ganha a nota "tema manual na web: Etapa 6"; (c) trocar o seletor escuro do `global.css` por um que o JS controle (só se for barato e coberto pelo `check-tokens`).
- [ ] **Step 2: Write the failing test** — `loadThemePref` devolve `"system"` sem valor e com valor inválido, e o valor guardado quando válido; `saveThemePref` guarda; `applyThemePref("dark")` chama `Appearance.setColorScheme("dark")`, `"light"` idem e `"system"` chama com `null`; `AppearanceCard`: marca a opção atual (`radio` selecionado), tocar em "Escuro" chama `saveThemePref("dark")` e `applyThemePref("dark")` e passa a marcar "Escuro", rótulos "Claro", "Escuro", "Sistema", e o grupo tem o nome "Tema do aplicativo"; o layout raiz aplica a preferência carregada antes de `SplashScreen.hideAsync` (teste do `RootLayout` com `loadThemePref` simulado).
- [ ] **Step 3: Run** `npm test -w apps/app -- appearance`. Expected: FAIL.
- [ ] **Step 4: Implement** os módulos, o cartão e a integração no layout raiz.
- [ ] **Step 5: Run** `npm test -w apps/app -- appearance shell`, `npx expo export -p web` e `-p ios` em `apps/app`. Expected: PASS; exports sem erro.
- [ ] **Step 6: Commit** `feat(app): aparência com tema manual (claro, escuro, sistema)`.

### Task 2: Dados da organização e `inviteLink` no shared

**Files:**
- Move: `apps/api/src/lib/invites.ts` → `packages/shared/src/invites.ts` (a API re-exporta), com o teste existente em `apps/api/tests/invites.test.ts` → `packages/shared/tests/invites.test.ts`
- Create: `apps/app/src/lib/org.ts`, `apps/app/src/lib/me-query.ts`
- Test: `apps/app/tests/org.test.tsx`

**Interfaces:**
- Consumes: `authClient` (Plano 2), `ApiClient`, `fetchMe`, `API_URL`.
- Produces:
  - `inviteLink(invitationId: string, baseUrl: string): string` em `@medicron/shared` (mesma assinatura e comportamento de hoje).
  - `useMe()` em `me-query.ts`: a consulta `["me"]` (já usada por Conta e cabeçalho) num só hook, habilitada com sessão; o cabeçalho e Conta passam a usá-lo.
  - `org.ts`: `inviteMember(email: string, role: "admin" | "member"): Promise<{ id: string }>` (lança `Error` com a mensagem do servidor ou "Não foi possível criar o convite."), `cancelInvitation(id: string): Promise<void>` (lança "Não foi possível cancelar o convite."), `getInvitation(id: string): Promise<InvitationInfo | null>` (`null` quando a chamada falha ou não existe), `acceptInvitation(id: string): Promise<{ organizationId: string }>` (lança com a mensagem do site: "Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail)."; ao aceitar, ativa a conta com `setActive`, avisa a lista de contas (`authClient.$store.notify("$listOrg")`) e chama `resetAccountData()`), e `useActiveOrganization()` (re-exporta o do cliente), com o tipo `InvitationInfo = { status: string; organizationName: string; inviterEmail: string }`.
  - `inviteLink` do `shared` nos dois lados (API e app).

- [ ] **Step 1: Write the failing test** — shared: o teste de `inviteLink` movido (barra final removida); app com `authClient` simulado: `inviteMember` chama `organization.inviteMember({ email, role })`, devolve o `id`, e com `error` lança a mensagem do servidor (ou a padrão); `cancelInvitation` chama `cancelInvitation({ invitationId })` e lança a mensagem padrão no erro; `getInvitation` chama `getInvitation({ query: { id } })` e devolve `null` em erro ou sem dados; `acceptInvitation` chama `acceptInvitation({ invitationId })`, depois `setActive({ organizationId })`, depois `$store.notify("$listOrg")` e esvazia o cache da conta anterior (dados de `["patients"]` somem; `["me"]` fica), e em erro lança a mensagem do site sem ativar nada; `useMe` consulta `/me` só logado.
- [ ] **Step 2: Run** `npm test -w packages/shared -- invites` e `npm test -w apps/app -- org`. Expected: FAIL.
- [ ] **Step 3: Implement** os módulos e a mudança de lugar do `inviteLink`.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde; total de testes sem queda.
- [ ] **Step 5: Commit** `feat(app): dados da organização e convites; inviteLink no shared`.

### Task 3: Peças da tela Conta (pessoas, convite, link, pendentes)

**Files:**
- Modify: `apps/app/package.json` (`expo-clipboard`, via `npx expo install`, versão fixada)
- Create: `apps/app/src/components/{member-row,invitation-row,invite-form,copy-link}.tsx`
- Test: `apps/app/tests/conta-parts.test.tsx`

**Interfaces:**
- Consumes: T2 (`inviteMember`, `cancelInvitation`), `inviteLink`, `API_URL`, `initials` (`apps/app/src/lib/initials.ts`), `Avatar`, `Badge`, `Card` e partes, `Button`, `FormField`, `Input`, `SelectField`, `ConfirmSheet`, `toast`, `expo-clipboard`.
- Produces:
  - `MemberRow({ name, email, role })`: avatar com iniciais (`bg-brand-soft`), nome, e-mail e selo `secondary` com "Dono", "Administrador" ou "Membro" (papel desconhecido mostra o texto do papel).
  - `CopyLink({ link })`: caixa `bg-brand-soft` com "Convite criado. Envie este link para a pessoa:", campo somente leitura "Link do convite" (seleciona ao focar) e botão de ícone "Copiar link do convite" que copia e avisa `toast.success("Link copiado")`.
  - `InviteForm({ onCreated?: () => void })`: campo "E-mail da pessoa" (teclado de e-mail, sem capitalizar), "Papel" (`SelectField`: "Administrador (gerencia tudo)" padrão, "Membro"; dica "Administradores também podem convidar pessoas."), botão "Gerar link de convite" (spinner e desabilitado enquanto envia; duplo toque envia uma vez). Validação: e-mail vazio ou fora de `algo@algo.algo` mostra "Informe um e-mail válido" e não envia. Sucesso: mostra `CopyLink` com `inviteLink(id, API_URL)`, limpa o e-mail. Erro: `toast.error(mensagem do servidor ou "Não foi possível criar o convite.")`, mantendo o e-mail.
  - `InvitationRow({ id, email })`: ícone de e-mail, e-mail (truncado), selo `outline` "Pendente", botão "Copiar link" (copia `inviteLink(id, API_URL)`, `toast.success("Link copiado")`) e botão "Cancelar" que abre `ConfirmSheet` "Cancelar convite?" / "O link enviado para `{email}` deixará de funcionar." / "Cancelar convite"; ao confirmar chama `cancelInvitation`; sucesso `toast.success("Convite cancelado")`; erro `toast.error("Não foi possível cancelar o convite.")` e o sheet continua.

- [ ] **Step 1: Write the failing test** — `MemberRow`: três papéis e um desconhecido; `CopyLink`: texto, valor e copiar (clipboard simulado) com aviso; `InviteForm`: padrão Administrador, trocar para Membro muda o papel enviado, e-mail vazio e `"abc"` mostram o erro e não enviam, envio válido chama `inviteMember` uma vez mesmo com dois toques e mostra o link, erro mantém o e-mail e avisa; `InvitationRow`: copiar, cancelar com confirmação, erro mantém o sheet.
- [ ] **Step 2: Run** `npm test -w apps/app -- conta-parts`. Expected: FAIL.
- [ ] **Step 3: Implement** (`npx expo install expo-clipboard`, fixar a versão; mock do `expo-clipboard` no jest).
- [ ] **Step 4: Run** os testes e `npx expo export -p web` e `-p ios`. Expected: PASS; exports sem erro.
- [ ] **Step 5: Commit** `feat(app): pessoas, convite, link e convites pendentes`.

### Task 4: Tela Conta

**Files:**
- Modify: `apps/app/src/app/(app)/conta.tsx` (substitui a versão provisória)
- Test: `apps/app/tests/conta-screen.test.tsx`; ajustar `apps/app/tests/screens.test.tsx` (a Conta provisória sai)

**Interfaces:**
- Consumes: T1 (`AppearanceCard`), T2 (`useActiveOrganization`, `useMe`), T3, `Screen`, `PageHeader`, `Card`, `ErrorView`, `Skeleton`.
- Produces: `PageHeader` com o nome da conta (ou "Conta") e "Pessoas, convites e preferências desta conta."; cartão "Pessoas nesta conta" / "Todas veem e registram os mesmos cuidados." com `MemberRow` por membro; se o papel for dono ou administrador, cartão "Convidar alguém" / "Gere um link e envie por mensagem. Vale por 7 dias." com `InviteForm` e, se houver convites pendentes (`status === "pending"`), o bloco "Convites pendentes" com `InvitationRow`; cartão "Aparência" com `AppearanceCard`. Carregando (organização ou papel pendentes) mostra esqueleto, sem piscar o cartão de convite; erro mostra `ErrorView`; puxar para atualizar refaz `useActiveOrganization` e `/me`.

- [ ] **Step 1: Write the failing test** — com organização simulada: título e descrição; lista de pessoas com os papéis; dono e administrador veem "Convidar alguém"; membro **não** vê "Convidar alguém" nem "Convites pendentes"; pendentes só aparecem para quem convida e só os `pending` (um `accepted` não); sem pendentes não mostra o bloco; carregando mostra esqueleto e não renderiza o cartão de convite enquanto o papel não chega; erro mostra "Tentar de novo"; "Aparência" presente; o aviso de notificações **não** aparece.
- [ ] **Step 2: Run** `npm test -w apps/app -- conta-screen screens`. Expected: FAIL.
- [ ] **Step 3: Implement** a tela.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `-p ios`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): tela Conta (pessoas, convites e aparência)`.

### Task 5: Tela de convite e guarda de rotas

**Files:**
- Create: `apps/app/src/app/convite/[id].tsx`
- Modify: `apps/app/src/lib/route-guard.ts`
- Test: `apps/app/tests/invite-screen.test.tsx`; ampliar `apps/app/tests/route-guard.test.ts`

**Interfaces:**
- Consumes: T2 (`getInvitation`, `acceptInvitation`), `AuthShell` ou o cartão central do site, `BrandMark`, `Button`, `Alert`, `Skeleton`, `useRouter`, `useLocalSearchParams<{ id: string }>`.
- Produces:
  - `decideRoute` ganha duas regras: (1) **sem sessão** em `/convite/<id>` vai para `/cadastrar?next=<caminho codificado>` (como o site, e não `/entrar`); (2) **com sessão e sem nenhuma conta** (`orgCount === 0`) pode ficar em `/convite/*` (não vai para `/nova-conta`). Todo o resto segue como está.
  - Tela `convite/[id]`: cartão central com `BrandMark` grande. Carregando o convite: esqueleto. Convite indisponível (`getInvitation` nulo ou `status !== "pending"`): ícone `MailX`, título "Convite indisponível", texto "Este convite expirou, foi cancelado, já foi usado ou é para outro e-mail. Peça um novo link a quem convidou." Convite válido: ícone `UsersRound`, título "Entrar em `{organizationName}`", texto "`{inviterEmail}` convidou você para cuidar dos pacientes juntos." e o botão "Aceitar convite" (spinner e desabilitado enquanto aceita; duplo toque aceita uma vez). Sucesso: vai para a Hoje (`router.replace("/")`). Erro: `Alert` destrutivo com "Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail)." e o botão destravado.

- [ ] **Step 1: Write the failing test** — guarda: sem sessão em `/convite/abc` → `/cadastrar?next=%2Fconvite%2Fabc`; com sessão e 0 contas em `/convite/abc` fica; com sessão e 0 contas em `/` continua indo a `/nova-conta`; com sessão e contas em `/convite/abc` fica; tela: carregando, indisponível (nulo, `expired`, `accepted`) com o texto exato, válido com título e texto exatos, aceitar chama `acceptInvitation` uma vez com dois toques e leva a `/`, erro mostra a mensagem e destrava.
- [ ] **Step 2: Run** `npm test -w apps/app -- route-guard invite-screen`. Expected: FAIL.
- [ ] **Step 3: Implement** as regras da guarda e a tela.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `-p ios`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): tela de convite e guarda de rotas para convidados`.

### Task 6: Conferência contra o site e aprovação (com o usuário)

**Files:** nenhum arquivo de código (capturas fora do repositório).

- [ ] **Step 1: Rodar** o app no simulador (`EXPO_PUBLIC_API_URL=https://medicron.com.br npx expo start --ios`) com a conta do usuário (login feito **pelo usuário**).
- [ ] **Step 2: Verificar** no aparelho, com o usuário: Conta (pessoas, papéis, aparência nos três modos, inclusive fechar e abrir o app), gerar um convite e copiar o link, cancelar um convite; **fluxo completo do convidado** com uma segunda conta de e-mail diferente: abrir o link (`xcrun simctl openurl booted "exp://127.0.0.1:8081/--/convite/<id>"` no Expo Go), criar a conta pelo convite, aceitar e cair na Hoje com a conta convidada ativa; convite já usado/cancelado mostrando "Convite indisponível"; claro e escuro.
- [ ] **Step 3: Capturas lado a lado** com `https://medicron.com.br` (celular e desktop, claro e escuro) de Conta (dono) e de convite (válido e indisponível). Ajustar com teste o que destoar.
- [ ] **Step 4: Mostrar** as capturas ao usuário e só seguir com a aprovação dele; ajustes pedidos entram como correções com teste.

### Task 7: Fechamento do Plano 3D e da Etapa 3

**Files:**
- Modify: `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 3 concluída; nota sobre o tema manual na web conforme a Tarefa 1), `README.md` (estado do app)

- [ ] **Step 1: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 2: Revisão final** da branch por um revisor independente (modelo mais capaz); corrigir Critical e Important com teste antes; Minor ao ledger.
- [ ] **Step 3: Publicar** `vercel --prod --yes` (a API só ganha o re-export de `inviteLink`) e conferir `/entrar`, `/api/v1/config` e `/convite/x` (redireciona sem sessão) em `https://medicron.com.br`.
- [ ] **Step 4: Atualizar** o documento de design e o README, e commitar `docs: Plano 3D concluído (conta e convites) e Etapa 3 completa`.
