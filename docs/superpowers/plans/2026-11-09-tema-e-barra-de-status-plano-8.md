# Tema fixo na web e barra de status do iPhone Implementation Plan (Plano 8)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execução nativa). Steps use checkbox (`- [ ]`) syntax.

**Goal:** (1) Na web, a pessoa escolhe Padrão (segue o aparelho), Claro ou Escuro e a escolha fica salva; (2) o app aberto pela tela de início do iPhone com o aparelho em modo escuro não mostra a barra de status branca.

**Architecture:** O escuro continua vindo de variáveis CSS. O gerador de tokens passa a emitir também `:root[data-theme="light"]` e `:root[data-theme="dark"]` (mais específicos que o `@media`), e a web grava a escolha em `localStorage` e a aplica com `document.documentElement.dataset.theme`. Um script no `<head>` aplica a escolha antes da primeira pintura (sem piscar) e ajusta as metas de cor/barra de status. As cores de ícones (hex) seguem um hook de esquema que, na web, respeita a escolha.

**Tech Stack:** Expo web (react-native-web), NativeWind/CSS variables, jest-expo/RNTL.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (decisão da limpeza "Tema manual na web" passa a ser revogada por pedido do usuário).

## Global Constraints

- Português do Brasil com acentos; as cores continuam vindo do `globals.css` da API (fonte única) via `npm run sync-tokens`; `global.css` e `colors.generated.ts` nunca são editados à mão.
- Sem escolha salva = Padrão (segue o navegador); chave de armazenamento `medicron.theme` (mesma do nativo), valores `light` | `dark` | `system`.
- Nenhum deploy de produção neste plano sem o usuário testar o iPhone (a barra de status do iOS só se confirma no aparelho real).

## Review Focus

1. Escolher Claro com o aparelho em escuro (e o inverso) pinta tudo na escolha, inclusive ícones/SVG; "Padrão" volta a seguir o aparelho ao vivo.
2. Recarregar a página mantém a escolha sem piscar o tema errado.
3. `localStorage` indisponível (modo privado, bloqueado) não quebra o app: cai em Padrão.
4. A barra de status do iOS: modo escuro do aparelho com tema Padrão ou Escuro → barra escura (translúcida sobre o fundo do app); tema Claro → barra clara; o topo do app respeita a área segura.
5. O app nativo não muda de comportamento.

---

### Task 1: Tokens com tema fixo

**Files:** Modify `apps/app/scripts/sync-tokens.ts`, `apps/app/src/global.css` (gerado); Test `apps/app/tests/tokens.test.ts`.

**Interfaces:** `buildTokens(sourceCss).css` passa a conter, depois do bloco `@media (prefers-color-scheme: dark)`, os blocos `:root[data-theme="light"] { …tokens claros… }` e `:root[data-theme="dark"] { …tokens escuros… }` (mesmas variáveis dos blocos existentes).

- [ ] **Step 1: Teste (RED)**: o CSS gerado tem os dois blocos com `--background` claro e escuro respectivamente, aparecem depois do `@media` (a ordem não decide, a especificidade sim: `:root[data-theme]` vence `:root`), e `check-tokens` (comparação do disco) continua exigindo igualdade.
- [ ] **Step 2: Rodar** `npx jest tests/tokens.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** no gerador; `npm run sync-tokens`. **Step 4: Rodar** o teste. Expected: PASS. Commit `feat(app): tokens de tema fixo (claro e escuro)`.

### Task 2: Preferência de tema na web

**Files:** Create `apps/app/src/lib/theme-store.web.ts`, `apps/app/src/theme/use-scheme.ts`, `apps/app/src/theme/use-scheme.web.ts`; Modify `apps/app/src/lib/theme-pref.web.ts`, `apps/app/src/theme/colors.ts`, `apps/app/src/components/appearance-card.tsx`, `apps/app/public/index.html`; Test `apps/app/tests/theme-pref-web.test.ts`, `apps/app/tests/appearance.test.tsx`.

**Interfaces:**
- `theme-pref.web.ts` (mesma assinatura do nativo): `loadThemePref(): Promise<ThemePref>` lê `localStorage["medicron.theme"]` (inválido ou erro → `"system"`); `saveThemePref(pref)` grava (erro engolido); `applyThemePref(pref)` define `document.documentElement.dataset.theme` (`"light"`/`"dark"`; `"system"` remove o atributo), atualiza `<meta name="theme-color">` e `apple-mobile-web-app-status-bar-style` (ver Task 3) e avisa os assinantes do store.
- `useScheme(): "light" | "dark"` — nativo: `useColorScheme() === "dark" ? "dark" : "light"`; web: escolha salva (`light`/`dark`) ou, em `system`, o `matchMedia("(prefers-color-scheme: dark)")` ao vivo (via `useSyncExternalStore`). `useColors()` usa `useScheme()`.
- `AppearanceCard` deixa de se esconder na web.
- `public/index.html`: script síncrono no `<head>` que lê `medicron.theme` e define `data-theme` antes da primeira pintura (try/catch ao redor).

- [ ] **Step 1: Testes (RED)**: `loadThemePref` (vazio, válido, inválido, `localStorage` lançando); `applyThemePref("dark")` define `data-theme="dark"`, `"system"` remove; `useScheme` devolve a escolha com `matchMedia` oposto e segue o `matchMedia` em `system` (incluindo mudança ao vivo); `AppearanceCard` aparece na web com as três opções e o botão da escolha atual selecionado; escolher grava e aplica; `index.html` contém o script que lê `medicron.theme`.
- [ ] **Step 2: Rodar** os arquivos. Expected: FAIL.
- [ ] **Step 3: Implementar.** **Step 4: Rodar** `npx jest`, typecheck, lint. Expected: PASS. Commit `feat(app): escolha de tema (padrão, claro, escuro) na web`.

### Task 3: Barra de status do iPhone

**Files:** Modify `apps/app/public/index.html`, `apps/app/src/lib/theme-pref.web.ts`, o layout do app web (topo com área segura, se faltar); Test `apps/app/tests/web-public.test.ts`, `apps/app/tests/theme-pref-web.test.ts`.

**Interfaces:** `index.html` declara `apple-mobile-web-app-capable=yes`, `apple-mobile-web-app-status-bar-style` (padrão `default`), `theme-color` claro e escuro por `media`, e `html, body { background-color: var(--background) }`. O script do `<head>` e `applyThemePref` escolhem o estilo: esquema resolvido `dark` → `black-translucent`; `light` → `default`. Com `black-translucent` o conteúdo passa por baixo da barra: o cabeçalho do app soma `env(safe-area-inset-top)` (via `useSafeAreaInsets`) à altura.

- [ ] **Step 1: Testes (RED)**: `index.html` tem as três metas e o estilo de fundo; `applyThemePref("dark")` põe `black-translucent` e `"light"` põe `default`, e `system` decide pelo `matchMedia`; o cabeçalho com inset 47 renderiza com altura 56 + 47.
- [ ] **Step 2: Rodar.** Expected: FAIL. **Step 3: Implementar.** **Step 4: Rodar** a suíte do app + `npx expo export -p web` e conferir as metas em `dist/index.html`. Commit `fix(app): barra de status do iPhone acompanha o tema`.

### Task 4: Fechamento

- [ ] **Step 1:** Atualizar a spec (revogar "tema manual não existe na web"), `docs/passos-do-usuario.md` (teste no iPhone: instalar na tela de início de novo, modo escuro e claro, três escolhas) e README.
- [ ] **Step 2: Verificar** `npm test`, lint, typecheck, exports web/iOS. **Step 3: Revisão final** independente; corrigir Critical/Important com teste antes. **Step 4: Mesclar** em `main` e **publicar apenas o `medicron-web`** (estático; a API de `main` continua sem publicar), depois pedir o teste no iPhone.
