# Medicron Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Medicron uma identidade visual profissional, mobile-first e acessível em todas as telas existentes, sem alterar regras de negócio.

**Architecture:** Manter shadcn/ui (estilo `base-nova`, Base UI + Tailwind 4, já instalado) como biblioteca de componentes e construir por cima um sistema de design próprio: tokens de cor/raio/tipografia em `globals.css` (marca teal, neutros quentes, modo escuro), primitivos de app (`PageHeader`, `EmptyState`, `FormField`, `NativeSelect`) e um shell responsivo (barra inferior no celular, barra lateral no desktop). Ícones `lucide-react` no lugar de emojis. Páginas só trocam markup/estilo; `src/lib/services`, schema e actions ficam intactos.

**Tech Stack:** Next.js 16, Tailwind 4, shadcn/ui `base-nova` (`@base-ui/react`), `lucide-react`, `next-themes`, `sonner`, `vaul` (via shadcn `drawer`), Vitest + `@testing-library/react` + `jsdom`, Playwright (só para QA visual, fora das dependências do projeto).

**Spec:** Sem documento separado — pedido de 2026-11-04 (Thiago): "cara profissional", biblioteca de componentes responsiva aplicada ao app inteiro, decisões delegadas.

## Global Constraints

- Não modificar `src/lib/services/**`, `src/lib/db/**`, `src/app/**/actions.ts`, `drizzle/`: os 72 testes atuais continuam verdes a cada commit.
- Textos em português do Brasil com acentuação correta. Nenhum texto novo em inglês na UI.
- Mobile-first: layouts conferidos em 360 px e 390 px de largura, depois em 768 px e 1280 px. Sem rolagem horizontal.
- Alvos de toque ≥ 44 px (`h-11`) para botões, inputs, selects e itens de navegação.
- Contraste WCAG AA (4.5:1 texto, 3:1 componentes) em claro e escuro; foco visível em tudo; respeitar `prefers-reduced-motion`.
- Marca: teal. `theme_color` do PWA continua `#0d9488`; o `primary` claro é teal de contraste AA com texto branco.
- Fonte: Geist (já carregada). Sem novas fontes externas.
- Selects de formulário continuam **nativos** (`<select>`), estilizados: no iOS/Android abrem o seletor do sistema e funcionam com Server Actions/`FormData` sem mudança.
- Novas dependências permitidas: `vaul`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`. Nada além.

## Review Focus

1. Nomes longos (gato 60 caracteres, item 80, e-mail longo) em 360 px: truncar/quebrar sem estourar o cartão nem empurrar botões para fora da tela.
2. Modo escuro: cores de status (atrasada, agora, próxima, feito) legíveis e distinguíveis sem depender só de cor (ícone + texto).
3. Teclado do iOS/safe areas: formulários e gaveta de "Feito" não ficam atrás do teclado nem da barra inferior; barra inferior respeita `safe-area-inset-bottom`.
4. Estados vazios, carregando e erro: toda rota de `(app)` tem `loading.tsx` e há `error.tsx` com "Tentar de novo" (hoje um erro vira tela branca).
5. Zoom/fonte grande (200%): cabeçalho e navegação continuam utilizáveis; nada depende de altura fixa de texto.

---

## File Structure

```
src/app/globals.css                         # tokens (marca, status, raio, sombras), utilitários
src/app/layout.tsx                          # + ThemeProvider, themeColor claro/escuro
src/app/(app)/{layout,loading,error}.tsx    # shell + estados
src/app/(auth)/layout.tsx                   # layout das telas de acesso
src/components/theme-provider.tsx
src/components/page-header.tsx  empty-state.tsx  form-field.tsx  status-badge.tsx
src/components/ui/native-select.tsx         # + avatar, separator, skeleton, alert, switch, dropdown-menu, drawer (shadcn add)
src/components/app-shell/{nav-items.ts,sidebar-nav.tsx,bottom-nav.tsx,user-menu.tsx,org-switcher.tsx}
src/lib/format.ts                           # initials()
src/lib/time.ts                             # + relativeLabel()
tests/ui/*.test.tsx                         # jsdom
```

---

### Task 1: Fundação do tema e dependências

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/button.tsx`, `src/components/ui/input.tsx`, `src/components/ui/textarea.tsx`, `vitest.config.ts`, `package.json`
- Create: `src/components/theme-provider.tsx`
- Test: `tests/ui/theme.test.tsx`

**Interfaces:**
- Produces: `ThemeProvider({ children }: { children: React.ReactNode })` (next-themes, `attribute="class"`, `defaultTheme="system"`, `enableSystem`, `disableTransitionOnChange`).
- Produces: tokens CSS `--brand`, `--success`, `--warning`, `--info` (+ `-foreground` e `-soft`) em claro/escuro, usados como utilitários Tailwind `bg-success-soft`, `text-warning` etc. via `@theme inline`.
- Produces: tamanhos de Button/Input/Textarea: `default` = `h-11`, `sm` = `h-9`, `lg` = `h-12`, `icon` = `size-11`, `icon-sm` = `size-9`.

- [ ] **Step 1: Instalar** `npm i vaul` e `npm i -D @testing-library/react @testing-library/jest-dom jsdom`; em `vitest.config.ts` incluir `tests/**/*.test.tsx` e `setupFiles: ["tests/ui/setup.ts"]` (importa `@testing-library/jest-dom/vitest`); arquivos `.tsx` de UI usam `// @vitest-environment jsdom`.
- [ ] **Step 2: Teste** `theme.test.tsx`: renderiza `<ThemeProvider><Button>Salvar</Button></ThemeProvider>` e assegura que o botão tem a classe `h-11`; assegura que `globals.css` (lido com `fs`) define `--success`, `--warning`, `--info` e `--brand` tanto em `:root` quanto em `.dark`.
- [ ] **Step 3:** Rodar `npx vitest run tests/ui/theme.test.tsx` → FAIL (provider inexistente / tokens ausentes).
- [ ] **Step 4:** Implementar. Paleta (oklch): marca teal ~`0.55 0.10 190` (claro, AA com branco) e ~`0.78 0.11 190` (escuro); fundo claro quente `oklch(0.985 0.004 90)`, cartões brancos, bordas `oklch(0.92 0.006 90)`; escuro `oklch(0.17 0.01 200)`; `--radius: 0.875rem`; status: success verde, warning âmbar, info azul, destructive vermelho, cada um com `-soft` (fundo suave) e `-foreground` com AA nos dois modos. `body`: `bg-background text-foreground antialiased`, `font-sans`; `h1..h3` com `tracking-tight`; `@media (prefers-reduced-motion: reduce)` zera animações/transições. Ajustar variantes de tamanho do Button/Input/Textarea conforme Interfaces. Envolver `<body>` com `ThemeProvider`, `suppressHydrationWarning` no `<html>`, `viewport.themeColor` com duas entradas (`prefers-color-scheme` claro `#0d9488`, escuro `#0f1b1c`).
- [ ] **Step 5:** `npx vitest run` (suite inteira, 72 + novos), `npx tsc --noEmit`, `npm run lint` → verdes. Commit `feat(ui): theme tokens, touch sizes, theme provider`.

### Task 2: Primitivos de interface

**Files:**
- Create: `src/components/ui/native-select.tsx`, `src/components/page-header.tsx`, `src/components/empty-state.tsx`, `src/components/form-field.tsx`, `src/components/status-badge.tsx`, `src/lib/format.ts`
- Add (shadcn CLI): `avatar separator skeleton alert switch dropdown-menu drawer`
- Test: `tests/ui/primitives.test.tsx`, `tests/format.test.ts`

**Interfaces:**
- Produces:
  - `NativeSelect(props: React.ComponentProps<"select">)` — `<select>` com `h-11`, borda/raio/foco do sistema e chevron (`ChevronDown`) por `appearance-none` + wrapper relativo; repassa `ref`, `name`, `defaultValue`, `required`.
  - `PageHeader({ title: string; description?: string; actions?: React.ReactNode; backHref?: string })` — `h1` (um por página), botão "Voltar" (`aria-label="Voltar"`) quando há `backHref`; título com `truncate`/`min-w-0`.
  - `EmptyState({ icon: LucideIcon; title: string; description?: string; action?: React.ReactNode })`.
  - `FormField({ label: string; htmlFor: string; hint?: string; error?: string; children: React.ReactNode })` — liga `label`, dica e erro (`aria-describedby`, `role="alert"` no erro).
  - `StatusBadge({ tone: "overdue" | "now" | "upcoming" | "done" | "skipped" })` — ícone lucide + texto em PT-BR ("Atrasada", "Agora", "Próxima", "Feito", "Pulado"); nunca só cor.
  - `initials(name: string): string` — até 2 letras maiúsculas ("Ana Paula" → "AP"; "mimi" → "M"; "" → "?").

- [ ] **Step 1: Testes** — `initials`: os três casos acima; `NativeSelect` repassa `name` e `defaultValue` e é selecionável por `getByRole("combobox")`; `FormField` com `error="Obrigatório"` expõe `role="alert"` e `aria-describedby` no controle; `PageHeader` com `backHref` mostra link "Voltar" e renderiza exatamente um `heading` nível 1; `StatusBadge tone="overdue"` contém o texto "Atrasada".
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** `npx shadcn@latest add avatar separator skeleton alert switch dropdown-menu drawer -y` e implementar os primitivos. **Step 4:** Rodar suite → PASS. **Step 5:** commit `feat(ui): app primitives`.

### Task 3: Shell responsivo, navegação, menu do usuário, loading e erro

**Files:**
- Create: `src/components/app-shell/{nav-items.ts,sidebar-nav.tsx,bottom-nav.tsx,user-menu.tsx,org-switcher.tsx}`, `src/app/(app)/loading.tsx`, `src/app/(app)/error.tsx`
- Modify: `src/app/(app)/layout.tsx`; Delete: `src/components/bottom-nav.tsx`, `src/components/org-switcher.tsx`
- Test: `tests/ui/nav.test.tsx`

**Interfaces:**
- Produces: `NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[]` = Hoje (`/`, `Home`), Gatos (`/gatos`, `Cat`), Itens (`/itens`, `Pill`), Conta (`/conta`, `Users`); `isActive(pathname: string, href: string): boolean` (`/` só casa exato; os demais por prefixo de segmento: `/gatos/x` ativa `/gatos`, `/gatosx` não).
- Produces: `BottomNav()` (visível `md:hidden`, `pb-[env(safe-area-inset-bottom)]`, item ativo com `aria-current="page"` e pílula de fundo), `SidebarNav()` (visível `hidden md:flex`, largura 16rem, logo `PawPrint` + "Medicron", mesmos itens).
- Produces: `UserMenu({ name: string; email: string })` — `DropdownMenu` com `Avatar` (iniciais), itens "Minha conta" (link `/conta`), "Tema: claro/escuro/sistema" e **"Sair"** (`authClient.signOut()` e `router.push("/entrar")`).
- Produces: `OrgSwitcher({ activeId: string })` — mesmo comportamento atual (lista `authClient.useListOrganizations`, `setActive`, "+ Nova conta…" → `/nova-conta`), agora em `DropdownMenu` com o nome da conta atual truncado.
- Consumes: `getOrgContext()` e `auth.api.getSession` no layout para obter nome/e-mail do usuário.

- [ ] **Step 1: Testes** — `isActive("/gatos/abc", "/gatos")` verdadeiro; `isActive("/gatosx", "/gatos")` falso; `isActive("/", "/")` verdadeiro e `isActive("/gatos", "/")` falso; `BottomNav` com `usePathname` mockado em `/itens` marca apenas "Itens" com `aria-current="page"` e renderiza os 4 links com nome acessível; `UserMenu` aberto mostra "Sair".
- [ ] **Step 2:** Rodar → FAIL. **Step 3:** implementar. Layout: `md:pl-64` + `SidebarNav` fixa; cabeçalho fixo com `OrgSwitcher` à esquerda e `UserMenu` à direita (no desktop o cabeçalho some o logo); conteúdo `mx-auto max-w-3xl px-4 py-6 pb-28 md:pb-10`; `Toaster` com `position="top-center"` e `richColors`. `loading.tsx`: esqueleto (`Skeleton`) de título + 3 cartões. `error.tsx` (client): `Alert` destrutivo "Algo deu errado" + botão "Tentar de novo" (`reset`) e link "Ir para o início". **Step 4:** suite + `tsc` + `lint` → verdes. **Step 5:** commit `feat(ui): responsive app shell, user menu, loading and error states`.

### Task 4: Telas de acesso (entrar, cadastrar, nova conta, convite)

**Files:**
- Modify: `src/app/(auth)/layout.tsx`, `src/app/(auth)/entrar/page.tsx`, `cadastrar/page.tsx`, `nova-conta/page.tsx`, `src/app/convite/[id]/page.tsx`, `src/components/accept-invite.tsx`
- Create: `src/components/password-input.tsx`
- Test: `tests/ui/auth.test.tsx`

**Interfaces:**
- Produces: `PasswordInput(props: React.ComponentProps<typeof Input>)` — campo com botão "Mostrar senha"/"Ocultar senha" (`aria-pressed`), `type` alterna `password`/`text`.
- Layout de acesso: coluna única centralizada no celular (logo `PawPrint` em círculo da marca, nome, subtítulo); em `md+` duas colunas — painel de marca com gradiente teal e 3 benefícios (ícones: lembretes, vários cuidadores, vários gatos) e o cartão do formulário.
- Formulários usam `FormField`, `Button` `lg` com estado de carregamento (`Loader2` girando, `disabled`), erro em `Alert`.

- [ ] **Step 1: Testes** — `PasswordInput`: por padrão `type=password`; clicar em "Mostrar senha" muda para `text` e o botão passa a "Ocultar senha" com `aria-pressed="true"`; a página de entrar renderiza campos com rótulos "E-mail" e "Senha" acessíveis por `getByLabelText`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar (lógica de submit e `safeNext` inalteradas) → **Step 4:** suite verde → **Step 5:** commit `feat(ui): auth screens`.

### Task 5: Dashboard "Hoje" e cartão de dose

**Files:**
- Modify: `src/app/(app)/page.tsx`, `src/components/dose-card.tsx`, `src/components/enable-notifications.tsx`, `src/lib/time.ts`
- Test: `tests/time.test.ts` (acrescenta), `tests/ui/dose-card.test.tsx`

**Interfaces:**
- Produces: `relativeLabel(target: Date, now: Date): string` — `|diff| < 60 s` → "agora"; futuro: "em 25 min", "em 2 h", "em 1 d"; passado: "há 25 min", "há 2 h", "há 1 d" (arredonda para baixo; usa min < 60, h < 24, senão d).
- `DoseCardProps` (mesmo contrato de dados) ganha `relative: string`; mantém `planId, scheduledFor, catName, itemName, dose, kind, timeLabel, tone`.
- Visual do cartão: faixa lateral colorida por `tone`, ícone (`Pill` para medicação, `Stethoscope` para procedimento), `StatusBadge`, hora em destaque + `relative`; botões "Feito" (`lg`, ícone `Check`) e "Pular" (outline). Procedimento: "Feito" abre `Drawer` (gaveta inferior) com campos "Valor" e "Observação" e botões "Confirmar"/"Cancelar" (substitui o formulário inline); `recordDoseAction` e toasts inalterados.
- Dashboard: cabeçalho "Hoje" com data por extenso (`Intl`, `America/Sao_Paulo`) e resumo em 3 chips (Atrasadas n · Agora n · Próximas n); seções com título e contagem; "Últimos registros" como linha do tempo compacta (ícone de resultado, gato · item, quem e quando); `EnableNotifications` vira cartão com ícone `BellRing` e `Switch`-like CTA; estado "sem gatos" e "sem agenda" usam `EmptyState`.

- [ ] **Step 1: Testes** — `relativeLabel`: `(now+25min, now)`→"em 25 min", `(now−2h, now)`→"há 2 h", `(now+30s, now)`→"agora", `(now−3d, now)`→"há 3 d"; `DoseCard` tone `overdue` mostra o texto "Atrasada" e, em procedimento, clicar "Feito" abre diálogo com campo "Valor" sem chamar a action; em medicação, "Feito" chama `recordDoseAction` (mockada) com `outcome: "done"`.
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** suite verde → **Step 5:** commit `feat(ui): dashboard and dose card`.

### Task 6: Gatos e Itens

**Files:**
- Modify: `src/app/(app)/gatos/{page.tsx,novo/page.tsx,[id]/page.tsx,[id]/rotina/nova/page.tsx}`, `src/app/(app)/itens/{page.tsx,novo/page.tsx,[id]/page.tsx}`, `src/components/{cat-form,item-form,plan-form}.tsx`
- Create: `src/components/segmented-links.tsx`
- Test: `tests/ui/lists.test.tsx`

**Interfaces:**
- Produces: `SegmentedLinks({ items: { href: string; label: string; active: boolean }[] })` — controle segmentado de links (`nav` com `aria-label`, ativo com `aria-current="page"`), substitui as abas feitas à mão em `/itens`.
- Lista de gatos: cartões com `Avatar` (iniciais, cor derivada do nome por hash estável entre 6 tons da marca), nome (`truncate`), meta (peso/nascimento quando houver) e seta; botão "Novo gato" fixo no topo (`PageHeader.actions`) e `EmptyState` com ícone `Cat`.
- Detalhe do gato: `PageHeader backHref="/gatos"`; seção "Rotina" com linhas por plano (ícone do tipo, nome + dose, `Badge` da frequência via `intervalLabel`, "próxima ..." com `formatDateTime`) e ação "Encerrar" dentro de `AlertDialog`-style confirmação (`Dialog` shadcn) antes de chamar `deactivatePlanAction`; seção "Dados" em cartão recolhido por padrão no celular não é necessário — usar cartões simples; "Arquivar gato" como botão destrutivo com confirmação em `Dialog`.
- Itens: `SegmentedLinks` Medicações/Procedimentos, cartões com ícone por tipo; formulários trocam `<select>` por `NativeSelect` e campos por `FormField`; `plan-form` agrupa "O quê", "Quando" e "Até quando" em cartões.
- Todos os textos longos com `min-w-0` + `truncate`/`line-clamp-2`.

- [ ] **Step 1: Testes** — `SegmentedLinks` marca só o ativo com `aria-current`; um cartão de gato com nome de 60 caracteres tem a classe `truncate` no nome (garante o Review Focus 1) e o `Avatar` mostra as iniciais; `plan-form` renderiza o `NativeSelect` de frequência com as 8 opções predefinidas + "Personalizada…".
- [ ] **Step 2:** FAIL → **Step 3:** implementar (props das Server Actions e `name`s dos campos inalterados — o formulário continua enviando os mesmos `FormData`) → **Step 4:** suite verde → **Step 5:** commit `feat(ui): cats and items screens`.

### Task 7: Conta, membros e convites

**Files:**
- Modify: `src/app/(app)/conta/page.tsx`, `src/components/{invite-form,invitation-row}.tsx`
- Test: `tests/ui/account.test.tsx`

**Interfaces:**
- Produces: seções em cartões — "Notificações" (`EnableNotifications` completo), "Pessoas" (cada membro: `Avatar`, nome, e-mail truncado, `Badge` de papel "Dono/Administrador/Membro"), "Convidar alguém" (visível só para dono/admin; `FormField` e-mail + `NativeSelect` papel; link gerado em campo com botão `Copy` e toast), "Convites pendentes" (linha com e-mail, `Badge` "Pendente", copiar link, cancelar com confirmação), "Aparência" (escolha Claro/Escuro/Sistema com `next-themes`).
- Consumes: `ROLE` map existente (`owner`, `admin`, `member`).

- [ ] **Step 1: Testes** — `InvitationRow` com e-mail de 80 caracteres mantém os botões "Copiar link" e "Cancelar" acessíveis (nome acessível) e o e-mail com `truncate`; escolher "Escuro" na seção Aparência chama `setTheme("dark")` (mock de `next-themes`).
- [ ] **Step 2:** FAIL → **Step 3:** implementar → **Step 4:** suite verde → **Step 5:** commit `feat(ui): account screen`.

### Task 8: Identidade do PWA

**Files:**
- Modify: `public/manifest.webmanifest`, `public/icons/*.png` (regerados), `src/app/layout.tsx` (metadados)
- Test: `tests/pwa.test.ts`

**Interfaces:**
- Ícones 192/512 `purpose: "any"` + 512 `purpose: "maskable"` (com área segura de 80%) e `apple-touch-icon` 180: fundo teal da marca, silhueta de patinha/gato branca desenhada por script em `scratchpad` (mesmo método de `node:zlib` já usado) — sem dependências novas.
- `manifest`: `background_color` do fundo claro quente, `theme_color: "#0d9488"`, `shortcuts`: "Hoje" (`/`) e "Gatos" (`/gatos`), `categories: ["health", "lifestyle"]`.

- [ ] **Step 1: Teste** `pwa.test.ts`: lê o manifest e confere nome "Medicron", `display: "standalone"`, ícones 192 e 512 existentes em disco, pelo menos um ícone com `purpose` contendo `maskable`, e dois `shortcuts`.
- [ ] **Step 2:** FAIL → **Step 3:** gerar ícones e atualizar manifest → **Step 4:** PASS → **Step 5:** commit `feat(pwa): brand icons and manifest`.

### Task 9: QA visual, acessibilidade e deploy

**Files:** nenhum arquivo de produto novo; capturas em `scratchpad`.

- [ ] **Step 1:** `npm run lint`, `npx tsc --noEmit`, `npx vitest run`, `npm run build` → tudo verde.
- [ ] **Step 2:** Subir `npm run dev` com `.env.local` e criar no banco uma **conta de demonstração isolada** (e-mail `demo+medicron@example.com`, uma org própria com 2 gatos — um com nome de 60 caracteres —, 3 itens e rotinas variadas). Instalar Playwright fora do projeto (`npx -y playwright install chromium` em diretório do scratchpad) e capturar todas as telas em 360, 390, 768 e 1280 px, claro e escuro.
- [ ] **Step 3:** Rodar `@axe-core/playwright` (instalado só no scratchpad) nas telas principais: Expected: 0 violações `serious`/`critical`. Conferir manualmente as capturas contra o Review Focus (1–5); corrigir o que falhar com teste de regressão quando for lógica.
- [ ] **Step 4:** Apagar a conta e a org de demonstração do banco (consulta SQL direta nas tabelas de domínio e de auth; verificar que as contas reais permanecem intactas por contagem antes/depois).
- [ ] **Step 5:** `vercel deploy --prod --yes`; conferir `/entrar` 200 e `/` 307; commit final `chore: redesign QA`.

---

## Self-Review (feito)

- **Cobertura do pedido:** biblioteca de componentes responsiva (shadcn + Drawer/Dropdown/Avatar etc., T1–T2), aplicada em todas as telas: acesso/convite (T4), Hoje (T5), Gatos/Itens/rotina (T6), Conta (T7); shell e navegação responsiva (T3); PWA (T8); verificação visual e a11y (T9).
- **Fora de escopo explícito:** nenhuma regra de negócio, service, schema ou Server Action é alterada; formulários mantêm os mesmos `name`s.
- **Consistência de tipos:** `DoseCardProps` estende o existente com `relative`; `NativeSelect`, `FormField`, `PageHeader`, `EmptyState`, `StatusBadge` definidos na T2 e só consumidos depois; `NAV_ITEMS`/`isActive` definidos e testados na T3.
- **Review Focus:** 1 → T6/T7 (testes de `truncate`); 2 → T2 (`StatusBadge` com texto) + T9 (capturas escuras); 3 → T3 (safe area) + T9; 4 → T3 (`loading.tsx`/`error.tsx`); 5 → T9.
- **Decisões tomadas por autonomia:** manter shadcn/ui `base-nova` em vez de trocar de biblioteca; marca teal; selects nativos por usabilidade em celular; barra lateral no desktop e barra inferior no celular; adicionar "Sair" no menu do usuário (pendência da revisão anterior); QA com conta de demonstração isolada que é apagada ao fim.
