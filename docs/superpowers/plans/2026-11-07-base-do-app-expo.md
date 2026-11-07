# Base do app Expo (Etapa 2) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar `apps/app`, o app Expo (web, iOS e Android) com o mesmo visual do site de hoje, com tema claro e escuro, kit de UI, navegação, cliente da API e as telas de entrar, cadastrar e nova conta funcionando contra a API de produção.

**Architecture:** Um workspace novo `apps/app` (Expo SDK 58 + Expo Router) estilizado com NativeWind v5 sobre os mesmos tokens de cor do `globals.css` do site, gerados por script. Componentes de UI portam os de `apps/api/src/components/ui` mantendo variantes e classes. O app fala com o `better-auth` direto (plugin do Expo, sessão no armazenamento seguro) e com a API `/api/v1` por um cliente fino que injeta o cookie e a versão.

**Tech Stack:** Expo SDK 58, React Native 0.88, React 19.3, Expo Router, NativeWind 5.0.0-rc.1 + react-native-css 3.1.0-rc.1 + Tailwind 4.1.12, `@gorhom/bottom-sheet`, TanStack Query, `better-auth` + `@better-auth/expo` 1.7.18, jest-expo + `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 2). O teste descartável que provou a viabilidade está em `~/Projects/medicron-spike` (fora do repositório; consulte para referência, não dependa dele).

## Global Constraints

- Visual e usabilidade **iguais aos do site de hoje**: mesmas cores, espaçamentos, tipografia, ícones (lucide), textos em português do Brasil e fluxos. Só pode diferir o que é controle do navegador (spec, escolha 12).
- Alvos de toque de **44 px** (`h-11`/`size-11`) e contraste **AA** (≥ 4.5:1) nos dois temas.
- Versões fixadas **exatas**: `nativewind 5.0.0-rc.1`, `react-native-css 3.1.0-rc.1`, `tailwindcss 4.1.12`, `@tailwindcss/postcss 4.1.12`, `lightningcss 1.30.1` (este via `overrides` no `package.json` **da raiz**, não do workspace), `better-auth` e `@better-auth/expo` em `1.7.18`. O resto do Expo vem de `npx expo install` (versões compatíveis com o SDK 58).
- O modificador de opacidade (`/20`) **não funciona** em cores de token no nativo: usar tokens de alfa explícitos (`brand-20`, `brand-40`, `dot-off`), definidos no CSS.
- `grid` do CSS não existe no nativo: usar flex. Ícones não herdam `className`: a cor vem de `useColors()`.
- Identificador `app.medicron` (iOS `bundleIdentifier`, Android `package`), esquema `medicron`, nome "Medicron", tema automático (segue o sistema).
- O `AGENTS.md` do template Expo manda ler a documentação versionada (`https://docs.expo.dev/versions/v58.0.0/`) antes de usar APIs do Expo, do Expo Router ou do React Native; este SDK é novo demais para confiar na memória.
- O app lê a URL da API de `EXPO_PUBLIC_API_URL` (produção: `https://medicron.com.br`).
- **O kit de UI cresce por tela** (escolha minha): este plano porta só os componentes que as telas dele usam (texto, botão, campos, alerta, selo, cartão, separador, esqueleto, avatar, sheet, menu em sheet, avisos). Os demais componentes do site (checkbox, switch, select, textarea, diálogo, abas de seção etc.) entram no Plano 3, nas telas que os usam, para não ter código parado.
- Não registrar cookies, senhas nem tokens em log.
- Commits em português (`feat:`, `test:`, `chore:`, `refactor:`), terminando com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Deploys de produção estão autorizados (memória do projeto), mas este plano não publica nada: o site atual segue servindo a web até a Etapa 6.

## Review Focus

- Abrir uma rota protegida sem sessão leva a `/entrar?next=<rota>` e, depois do login, volta para ela; um `next` externo (`//evil.com`, `https://…`) vira `/`.
- A API devolvendo 426 (`app_outdated`) mostra uma tela fixa de "atualize o app", sem ficar repetindo a chamada.
- Falha de rede no login mostra erro em português e **destrava** o botão (nunca fica "Entrando…" para sempre).
- Trocar o tema do sistema com o app aberto troca as cores na hora, sem reiniciar.
- Em iPhone pequeno o teclado não cobre o botão "Entrar" (o formulário rola).
- Logout limpa a sessão do armazenamento seguro e volta para `/entrar`.

## File Structure

```
package.json (raiz)                 + overrides lightningcss, scripts que incluem apps/app
apps/app/                           o app Expo
  app.json, metro.config.js, postcss.config.mjs, tsconfig.json, jest.config.js, .env.example
  scripts/sync-tokens.mjs           gera src/global.css e src/theme/colors.generated.ts a partir do site
  scripts/build-assets.mjs          gera ícone, adaptive icon, splash e favicon do logo Ciclo
  src/app/                          rotas (Expo Router): (auth)/entrar|cadastrar|nova-conta, (app)/ abas
  src/components/ui/                kit portado de apps/api/src/components/ui
  src/components/                   brand-mark, app-header, tab-bar, sidebar-nav, menu-sheet...
  src/lib/                          api/, auth-client.ts, route-guard.ts, version.ts
  src/theme/                        colors.ts (useColors), fonts.ts, colors.generated.ts
packages/shared/src/                + slug.ts (orgSlug) e redirect.ts (safeNext), movidos de apps/api
```

---

### Task 1: Criar o workspace `apps/app` e a infraestrutura de testes

**Files:**
- Create: `apps/app/package.json`, `apps/app/app.json`, `apps/app/metro.config.js`, `apps/app/postcss.config.mjs`, `apps/app/tsconfig.json`, `apps/app/jest.config.js`, `apps/app/.env.example`, `apps/app/nativewind-env.d.ts`, `apps/app/src/app/_layout.tsx`, `apps/app/src/app/index.tsx`, `apps/app/src/global.css` (provisório, a Task 2 passa a gerá-lo)
- Test: `apps/app/tests/smoke.test.tsx`
- Modify: `package.json` (raiz: `overrides: { "lightningcss": "1.30.1" }`), `.gitignore` (`.expo/`, `dist/`)

**Interfaces:**
- Produces: workspace `@medicron/app` com scripts `start`, `web`, `ios`, `android`, `test` (`jest`), `lint` (`expo lint`), `typecheck` (`tsc --noEmit`); alias `@/*` → `src/*`; dependência `@medicron/shared`.

- [ ] **Step 1: Write the failing test** (`smoke.test.tsx`): renderizar `<Index />` (a rota inicial) com `@testing-library/react-native` e afirmar que aparece o texto "Medicron".
- [ ] **Step 2: Run** `npm test -w apps/app`. Expected: FAIL (workspace e arquivos inexistentes).
- [ ] **Step 3: Implement** o workspace: partir de `npx create-expo-app` com o template padrão fora do repositório só para ler o que ele gera (não copiar o conteúdo de exemplo), criar `package.json` com as dependências instaladas por `npx expo install` e as versões fixas da seção Global Constraints, `app.json` (nome, `slug: "medicron"`, `scheme: "medicron"`, `ios.bundleIdentifier` e `android.package` = `app.medicron`, `userInterfaceStyle: "automatic"`, `web.output: "single"`, plugins do Expo Router, `expo-secure-store`, `expo-font`), Metro com `withNativewind`, PostCSS com `@tailwindcss/postcss`, jest com o preset `jest-expo`. Dependências de execução esperadas: `expo-router`, `react-native-reanimated`, `react-native-worklets`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, `expo-linear-gradient`, `expo-secure-store`, `expo-constants`, `expo-font`, `expo-status-bar`, `expo-system-ui`, `expo-splash-screen`, `@gorhom/bottom-sheet`, `lucide-react-native`, `class-variance-authority`, `clsx`, `tailwind-merge`, `@tanstack/react-query`, `better-auth`, `@better-auth/expo`, `@medicron/shared`; de teste: `jest-expo`, `jest`, `@types/jest`, `@testing-library/react-native`.
- [ ] **Step 4: Run** `npm install` na raiz e `npm test -w apps/app`. Expected: PASS. Rodar também `npx expo export -p web` dentro de `apps/app`. Expected: gera `dist/` sem erro (confirma Metro, NativeWind e o workspace).
- [ ] **Step 5: Verificar o resto do monorepo.** `npm test`, `npm run lint`, `npm run build` na raiz. Expected: o que já passava continua passando (305 testes da API e 8 do shared).
- [ ] **Step 6: Commit** `feat(app): workspace do app Expo com NativeWind v5 e jest-expo`.

### Task 2: Pipeline de tokens (cores iguais às do site)

**Files:**
- Create: `apps/app/scripts/sync-tokens.mjs`, `apps/app/src/theme/colors.generated.ts`, `apps/app/src/theme/colors.ts`
- Modify: `apps/app/src/global.css` (passa a ser gerado), `apps/app/package.json` (scripts `sync-tokens` e `check-tokens`)
- Test: `apps/app/tests/tokens.test.ts`

**Interfaces:**
- Consumes: `apps/api/src/app/globals.css` (fonte única das cores).
- Produces:
  - `scripts/sync-tokens.mjs` exporta `buildTokens(sourceCss: string): { css: string; colors: { light: Record<string,string>; dark: Record<string,string> } }` e, executado direto, grava `src/global.css` e `src/theme/colors.generated.ts` (hex por token).
  - `colors.ts`: `useColors(): ThemeColors` (escolhe claro ou escuro por `useColorScheme()` e muda quando o sistema muda o tema), com as chaves usadas por ícones e SVG: `foreground`, `muted`, `primary`, `primaryForeground`, `brandInk`, `successInk`, `warningInk`, `destructiveInk`, `infoInk`, `heroAccent`.
  - `global.css` gerado: variáveis `:root` do tema claro; sob `@media (prefers-color-scheme: dark)` as do escuro; `@theme inline` mapeando cada `--color-*`; tokens de alfa explícitos `--brand-20`, `--brand-40`, `--dot-off` (claro e escuro) em `oklch(... / alfa)`.

- [ ] **Step 1: Write the failing tests** (`tokens.test.ts`): (a) `buildTokens` sobre o `globals.css` real devolve CSS cujo bloco claro contém `--primary: oklch(0.48 0.09 190)` e cujo bloco escuro (dentro de `prefers-color-scheme: dark`) contém `--primary: oklch(0.46 0.09 190)`; (b) o CSS gerado contém `--color-brand-20: var(--brand-20)` e `--brand-20` com `/ 0.2`; (c) a conversão devolve hex para `oklch(1 0 0)` → `#ffffff` e para `oklch(0 0 0)` → `#000000`; (d) **os arquivos versionados estão em dia**: `buildTokens(globals.css).css` é igual ao conteúdo de `src/global.css` e `colors` igual ao de `colors.generated.ts`; (e) `useColors()` devolve `light.primary` com o esquema claro e `dark.primary` com o escuro, e troca ao mudar o esquema com o componente montado; (f) contraste AA (≥ 4.5) de `primary`/`primary-foreground`, `hero-from`/`hero-to`/`hero-core` contra branco, e `link` contra `background`, nos dois temas (reaproveitar a fórmula de `apps/api/tests/theme-contrast.test.ts`).
- [ ] **Step 2: Run** `npm test -w apps/app -- tokens`. Expected: FAIL.
- [ ] **Step 3: Implement** o script (conversão oklch→sRGB pelas fórmulas de Björn Ottosson, já usadas em `apps/api/tests/theme-contrast.test.ts`), `colors.ts` e rodar `npm run sync-tokens -w apps/app` para gerar os dois arquivos.
- [ ] **Step 4: Run** os testes. Expected: PASS (inclui o teste de "em dia", que falha se alguém mexer no `globals.css` do site sem rodar o script).
- [ ] **Step 5: Commit** `feat(app): tokens de cor gerados a partir do site, claro e escuro`.

### Task 3: Marca, ícones e fontes

**Files:**
- Create: `apps/app/scripts/build-assets.mjs`, `apps/app/assets/` (gerados), `apps/app/src/theme/fonts.ts`
- Modify: `apps/app/app.json` (`icon`, `splash`, `android.adaptiveIcon`, `web.favicon`), `apps/app/src/app/_layout.tsx` (carrega as fontes e segura a tela de abertura), `apps/app/package.json` (dependências `@expo-google-fonts/geist`, devDependency `@resvg/resvg-js`)
- Create: `apps/app/src/components/brand-mark.tsx`
- Test: `apps/app/tests/fonts.test.ts`, `apps/app/tests/brand-mark.test.tsx`

**Interfaces:**
- Produces:
  - `fonts.ts`: `GEIST_FONTS` (mapa passado a `useFonts`) e `fontFamilyFor(className: string): string`, que lê as classes `font-normal|font-medium|font-semibold|font-bold` e devolve `Geist_400Regular|Geist_500Medium|Geist_600SemiBold|Geist_700Bold` (padrão 400), porque no nativo o peso da fonte vem da família, não de `fontWeight`.
  - `BrandMark({ className?, size? })`: o anel com o ponto do logo Ciclo, em SVG, igual ao `apps/api/src/components/brand-mark.tsx`.
  - `build-assets.mjs`: gera `icon.png` (1024), `adaptive-icon-foreground.png`, `adaptive-icon-background.png` (cor `#0f766e`), `splash-icon.png`, `favicon.png`, `notification-icon.png` (branco, fundo transparente) a partir do SVG do logo Ciclo (gradiente `#19c2b0`→`#0f766e`, anel e ponto `#99f6e4`), cuja geometria é a de `apps/api/public/icons/icon-512.png`.

- [ ] **Step 1: Write the failing tests:** `fontFamilyFor("text-sm font-semibold")` é `"Geist_600SemiBold"`, `("font-bold")` é `"Geist_700Bold"`, `("text-sm")` é `"Geist_400Regular"`; `BrandMark` renderiza um SVG com dois círculos e `accessibilityElementsHidden`.
- [ ] **Step 2: Run** `npm test -w apps/app -- fonts brand-mark`. Expected: FAIL.
- [ ] **Step 3: Implement** `fonts.ts`, `brand-mark.tsx`, o script de assets e o carregamento das fontes no layout raiz (a tela de abertura só some quando as fontes carregarem). Rodar o script e commitar os PNGs gerados.
- [ ] **Step 4: Run** os testes e `npx expo export -p web`. Expected: PASS; export sem erro.
- [ ] **Step 5: Commit** `feat(app): logo Ciclo, ícones, tela de abertura e fonte Geist`.

### Task 4: Kit de UI, parte 1: primitivas

**Files:**
- Create em `apps/app/src/components/ui/`: `text.tsx`, `button.tsx`, `input.tsx`, `form-field.tsx`, `password-input.tsx`, `alert.tsx`, `badge.tsx`, `card.tsx`, `separator.tsx`, `skeleton.tsx`, `avatar.tsx`, `icon.tsx`; `apps/app/src/lib/cn.ts`
- Test: `apps/app/tests/ui/primitives.test.tsx`

**Interfaces:**
- Produces (cada componente porta o equivalente de `apps/api/src/components/ui/*.tsx` e `apps/api/src/components/{form-field,password-input}.tsx`, mesmas variantes e classes):
  - `cn(...classes): string` (clsx + tailwind-merge).
  - `Text({ className, ...TextProps })`: aplica `text-foreground`, `text-base` e a família de `fontFamilyFor(className)`.
  - `Button({ variant: "default"|"outline"|"secondary"|"ghost"|"destructive"|"link", size: "default"|"sm"|"lg"|"icon", loading?, disabled?, children, onPress, accessibilityLabel? })`: `loading` mostra `ActivityIndicator` e bloqueia o toque; tamanhos `default h-11`, `lg h-12`, `sm h-9`, `icon size-11`.
  - `Input`, `FormField({ label, hint?, error?, children })`, `PasswordInput` (botão de olho com `accessibilityLabel` "Mostrar senha"/"Ocultar senha").
  - `Alert({ variant: "default"|"destructive", children })`, `AlertDescription`, `Badge({ variant })`, `Card`, `Separator`, `Skeleton`, `Avatar({ fallback })`.
  - `Icon({ icon: LucideIcon, color?: keyof ThemeColors, size? })`: resolve a cor por `useColors()` (ícones não herdam `className`).

- [ ] **Step 1: Write the failing tests** (`primitives.test.tsx`): `Button` dispara `onPress`, **não** dispara com `disabled` nem com `loading`, e mostra o indicador em `loading`; `PasswordInput` alterna `secureTextEntry` ao tocar no olho e troca o rótulo acessível; `FormField` mostra o `hint` e, quando há `error`, mostra o erro no lugar; `Alert` destructive expõe `accessibilityRole="alert"`; `Icon` aplica a cor do tema (verificar a prop `color` do ícone renderizado contra `useColors()`).
- [ ] **Step 2: Run** `npm test -w apps/app -- ui/primitives`. Expected: FAIL.
- [ ] **Step 3: Implement** os componentes, lendo cada original do site para manter variantes e classes (adaptar só o que o nativo não tem: `hover:`, `focus-visible:`, `grid`).
- [ ] **Step 4: Run** os testes. Expected: PASS. Conferir a tela de teste de cada variante no simulador/web é feito na Task 10.
- [ ] **Step 5: Commit** `feat(app): primitivas do kit de UI (texto, botão, campos, alerta, selo, cartão)`.

### Task 5: Kit de UI, parte 2: sheet, menu e avisos

**Files:**
- Create em `apps/app/src/components/ui/`: `drawer.tsx`, `menu-sheet.tsx`, `toast.tsx`
- Modify: `apps/app/package.json` (`sonner-native`)
- Test: `apps/app/tests/ui/overlays.test.tsx`

**Interfaces:**
- Produces:
  - `Drawer({ open, onOpenChange, title, description?, children, footer? })`: bottom sheet sobre `@gorhom/bottom-sheet` (`BottomSheetModal`, dimensionamento dinâmico, fundo escurecido, arrastar para baixo fecha e chama `onOpenChange(false)`); mesmo visual do sheet de boas-vindas do site (cantos `rounded-t-3xl`, alça, `pt-8`).
  - `MenuSheet({ open, onOpenChange, title?, items: { key: string; label: string; icon?: LucideIcon; destructive?: boolean; selected?: boolean; onPress(): void }[] })`: lista de ações em sheet, com linha `h-11` por item; é o equivalente nativo do `DropdownMenu`.
  - `toast.success(message)`, `toast.error(message)`, `toast.info(message)` e `<Toaster />` (topo, centralizado, como `position="top-center"` do site).

- [ ] **Step 1: Write the failing tests:** `Drawer` com `open` mostra título e conteúdo; chamar o fechamento do sheet dispara `onOpenChange(false)`; `MenuSheet` chama `onPress` do item tocado e depois fecha (`onOpenChange(false)`); item `destructive` tem estilo de erro; `toast.error("x")` aparece no `Toaster`.
- [ ] **Step 2: Run** `npm test -w apps/app -- ui/overlays`. Expected: FAIL.
- [ ] **Step 3: Implement** os três (o `BottomSheetModalProvider` e o `GestureHandlerRootView` ficam no layout raiz da Task 8; nos testes usar um wrapper que os fornece).
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): sheet, menu em sheet e avisos (toast)`.

### Task 6: Cliente da API e versão do app

**Files:**
- Create: `apps/app/src/lib/api/client.ts`, `apps/app/src/lib/api/errors.ts`, `apps/app/src/lib/api/query.ts`, `apps/app/src/lib/api/me.ts`, `apps/app/src/lib/version.ts`, `apps/app/src/components/update-required.tsx`
- Test: `apps/app/tests/api-client.test.ts`

**Interfaces:**
- Consumes: `API_PREFIX`, `ErrorDto`, `MeDto` de `@medicron/shared`; `authClient.getCookie()` (Task 7, injetado por parâmetro para o teste).
- Produces:
  - `createApiClient({ baseUrl: string, getCookie: () => Promise<string>, appVersion: string, fetch?: typeof fetch })` com `request<T>(method: "GET"|"POST"|"PATCH"|"DELETE", path: string, body?: unknown): Promise<T>`: monta `${baseUrl}${API_PREFIX}${path}`, envia `Cookie`, `x-app-version` e `content-type: application/json`, usa `credentials: "omit"`, devolve `undefined` em 204.
  - `class ApiClientError extends Error { status: number; code: string; issues?: unknown[] }`, `class AppOutdatedError extends ApiClientError` (status 426, `minAppVersion: string`), `class UnauthorizedError extends ApiClientError` (401).
  - `appVersion(): string` (de `Constants.expoConfig.version`). O singleton `apiClient` fica na Task 7, onde o cliente de login (de onde vem o cookie) passa a existir.
  - `queryClient` com `retry: false` para `ApiClientError` 4xx e `staleTime` de 30 s; `fetchMe(): Promise<MeDto>`.
  - `UpdateRequired({ minVersion })`: tela cheia "Atualize o app para continuar" com a versão mínima, sem botão de tentar de novo.

- [ ] **Step 1: Write the failing tests** (`fetch` simulado): a chamada leva `Cookie` e `x-app-version`; 204 devolve `undefined`; 401 lança `UnauthorizedError`; 426 lança `AppOutdatedError` com `minAppVersion` do corpo; 400 lança `ApiClientError` com `code: "invalid_request"` e `issues`; rede caindo lança `ApiClientError` com `code: "network"` e mensagem em português ("Sem conexão. Verifique a internet e tente de novo."); o `Cookie` nunca aparece em `console.log`/`console.error` (espiar o console).
- [ ] **Step 2: Run** `npm test -w apps/app -- api-client`. Expected: FAIL.
- [ ] **Step 3: Implement** o cliente, os erros, o `queryClient`, `fetchMe` e a tela `UpdateRequired`.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): cliente da API com cookie, versão do app e erros tipados`.

### Task 7: Login (client), sessão e guarda de rotas

**Files:**
- Move: `apps/api/src/lib/slug.ts` → `packages/shared/src/slug.ts`; `apps/api/src/lib/redirect.ts` → `packages/shared/src/redirect.ts` (e seus testes `apps/api/tests/redirect.test.ts` e o de slug, se houver, para `packages/shared/tests/`); atualizar os imports em `apps/api` para `@medicron/shared`; exportar de `packages/shared/src/index.ts`.
- Create: `apps/app/src/lib/auth-client.ts`, `apps/app/src/lib/api/index.ts`, `apps/app/src/lib/route-guard.ts`, `apps/app/src/lib/session.tsx`
- Test: `apps/app/tests/route-guard.test.ts`, `apps/app/tests/auth-client.test.ts`, `apps/app/tests/session.test.tsx`

**Interfaces:**
- Consumes: `safeNext(next: string | null): string`, `orgSlug(name: string): string` (de `@medicron/shared` depois da mudança).
- Produces:
  - `authClient`: `createAuthClient({ baseURL: process.env.EXPO_PUBLIC_API_URL, plugins: [organizationClient(), expoClient({ scheme: "medicron", storagePrefix: "medicron", storage: SecureStore })] })`.
  - `decideRoute(input: { hasSession: boolean; orgCount: number; activeOrgId: string | null; pathname: string }): { to: string | null }`: sem sessão em rota protegida → `/entrar?next=<pathname codificado>` (e `/` vira só `/entrar`); sem sessão em rota pública (`/entrar`, `/cadastrar`) → `null`; com sessão sem nenhuma conta → `/nova-conta`; com sessão e conta, em rota pública → `/`; caso contrário `null`. Rotas públicas: `/entrar`, `/cadastrar`. `/nova-conta` exige sessão.
  - `apiClient` (em `lib/api/index.ts`): `createApiClient({ baseUrl: process.env.EXPO_PUBLIC_API_URL, getCookie: () => authClient.getCookie(), appVersion: appVersion() })`.
  - `useAppSession(): { status: "loading" | "signedOut" | "signedIn"; orgCount: number; activeOrgId: string | null; signOut(): Promise<void> }` (sobre `authClient.useSession()` e `useListOrganizations()`); `signOut` chama `authClient.signOut()` e limpa o cache do TanStack Query.

- [ ] **Step 1: Write the failing tests:** `decideRoute` cobre os cinco casos acima e o `next` de uma rota com query (`/pacientes?aba=dados`) codificado; `safeNext("//evil.com")`, `safeNext("https://evil.com")` e `safeNext("/\\x")` devolvem `/`, e `safeNext("/pacientes/1")` devolve ele mesmo (testes movidos); `orgSlug("Casa da Vovó")` começa com `casa-da-vovo-`; `authClient` expõe `organization.create` e `signIn.email` (existência das funções, sem rede); `signOut()` de `useAppSession` chama `authClient.signOut()` e esvazia o cache do TanStack Query (um dado de usuário não pode sobrar para o próximo).
- [ ] **Step 2: Run** `npm test -w packages/shared -w apps/app`. Expected: FAIL.
- [ ] **Step 3: Implement** a movimentação dos dois helpers (mantendo os testes existentes verdes em `apps/api` e `packages/shared`), o `auth-client.ts`, o `route-guard.ts` e o `session.tsx`.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo PASS (a API e o shared continuam passando depois da movimentação).
- [ ] **Step 5: Commit** `feat(app): cliente de login, sessão e guarda de rotas; slug e safeNext no shared`.

### Task 8: Navegação e casca do app

**Files:**
- Create: `apps/app/src/app/_layout.tsx` (substitui o provisório), `apps/app/src/app/(app)/_layout.tsx`, `apps/app/src/app/(app)/index.tsx`, `apps/app/src/app/(app)/pacientes.tsx`, `apps/app/src/app/(app)/itens.tsx`, `apps/app/src/app/(app)/conta.tsx`, `apps/app/src/components/tab-bar.tsx`, `apps/app/src/components/sidebar-nav.tsx`, `apps/app/src/components/app-header.tsx`, `apps/app/src/components/empty-state.tsx`, `apps/app/src/lib/nav-items.ts`
- Test: `apps/app/tests/shell.test.tsx`

**Interfaces:**
- Consumes: `decideRoute`, `useAppSession`, `apiClient` (Task 7); `MenuSheet`, `Toaster` (Task 5); `UpdateRequired`, `queryClient`, `fetchMe` (Task 6); `BrandMark`, `useColors`.
- Produces:
  - `NAV_ITEMS` e `isActive(pathname, href)` com a mesma lógica de `apps/api/src/components/app-shell/nav-items.ts`, com rótulos Hoje, Pacientes, Itens, Conta e as rotas `/`, `/pacientes`, `/itens`, `/conta`.
  - `_layout.tsx` raiz: `GestureHandlerRootView` → `SafeAreaProvider` → `QueryClientProvider` → `BottomSheetModalProvider` → `Stack`; `StatusBar` automática; `Toaster`; aplica `decideRoute` a cada mudança de rota (redireciona com `router.replace`); se a API devolver `AppOutdatedError`, renderiza `UpdateRequired` no lugar de tudo.
  - `(app)/_layout.tsx`: abas na barra inferior em largura de celular (igual ao `BottomNav` do site: 4 itens, ativo com `bg-brand-soft`) e **barra lateral** (`SidebarNav`, igual à do site) a partir de 768 px de largura; cabeçalho `AppHeader` com `BrandMark`, seletor de conta (nome da conta ativa + `ChevronsUpDown`, abre `MenuSheet` com as contas, a opção "Nova conta…" que leva a `/nova-conta`) e menu do usuário (avatar com a inicial; itens "Minha conta" e "Sair").
  - Telas `index`, `pacientes`, `itens`, `conta`: `EmptyState` "Em construção" (as telas reais são do Plano 3), exceto `conta`, que já mostra o e-mail do usuário vindo de `fetchMe()`.

- [ ] **Step 1: Write the failing tests** (`shell.test.tsx`): `isActive("/pacientes/abc", "/pacientes")` é `true` e `isActive("/pacientesx", "/pacientes")` é `false`; `"/"` só casa exato; `TabBar` marca o item ativo (`accessibilityState.selected`) e navega ao tocar; quando `fetchMe` falha com `AppOutdatedError`, o layout raiz mostra `UpdateRequired` e a chamada **não** é repetida (uma só tentativa); `AppHeader` mostra o nome da conta ativa, abre o menu de contas ao tocar e "Sair" chama `signOut` e leva a `/entrar`; em largura ≥ 768 o layout renderiza `SidebarNav` e não `TabBar` (simular `useWindowDimensions`).
- [ ] **Step 2: Run** `npm test -w apps/app -- shell`. Expected: FAIL.
- [ ] **Step 3: Implement** o layout raiz, o grupo `(app)`, os componentes e as telas provisórias.
- [ ] **Step 4: Run** os testes e `npx expo export -p web`. Expected: PASS; export sem erro.
- [ ] **Step 5: Commit** `feat(app): casca com abas, barra lateral, cabeçalho e guarda de rotas`.

### Task 9: Telas de entrar, cadastrar e nova conta

**Files:**
- Create: `apps/app/src/app/(auth)/_layout.tsx`, `apps/app/src/app/(auth)/entrar.tsx`, `apps/app/src/app/(auth)/cadastrar.tsx`, `apps/app/src/app/nova-conta.tsx`
- Test: `apps/app/tests/auth-screens.test.tsx`

**Interfaces:**
- Consumes: `authClient`, `safeNext`, `orgSlug`, `FormField`, `PasswordInput`, `Input`, `Button`, `Alert`, `BrandMark`.
- Produces: três telas que reproduzem as de `apps/api/src/app/(auth)/{entrar,cadastrar,nova-conta}/page.tsx` com **os mesmos textos e comportamento**:
  - `entrar`: título "Entrar", subtítulo "Acesse sua conta para ver os cuidados de hoje."; erro "E-mail ou senha incorretos."; botão "Entrar" / "Entrando…"; link "Primeira vez? Criar conta" levando a `/cadastrar?next=<next>`; após sucesso `router.replace(safeNext(next))`.
  - `cadastrar`: título "Criar conta", subtítulo "Leva menos de um minuto. Depois é só cadastrar seus pacientes."; campos "Seu nome", "E-mail", "Senha" (dica "Mínimo de 8 caracteres.", mínimo 8 validado no cliente); depois de criar a conta cria a organização `Casa de <primeiro nome>` (a menos que `next` comece com `/convite/`); erro de criação da casa "Conta criada, mas não foi possível criar sua casa. Tente em Nova conta."; link "Já tem conta? Entrar".
  - `nova-conta`: título "Nova conta", texto "Cada conta tem seus próprios pacientes, itens e pessoas. Use uma para cada casa ou família.", campo "Nome da conta" (dica "Ex.: Casa da vovó", máx. 60), cria e ativa a organização e vai para `/`; erro "Não foi possível criar a conta.".
  - `(auth)/_layout`: em celular, `BrandMark` grande e a frase "Horários de remédios e cuidados de quem você cuida" acima do formulário, dentro de um `KeyboardAvoidingView` + `ScrollView` (o teclado nunca cobre o botão); a partir de 768 px, painel verde à esquerda (degradê `hero-from`→`hero-to`, texto branco, os mesmos três benefícios do site) e o formulário à direita.
  - Falha de rede em qualquer das três: mensagem "Sem conexão. Verifique a internet e tente de novo." e botão destravado.

- [ ] **Step 1: Write the failing tests** (`auth-screens.test.tsx`, `authClient` simulado): `entrar` com falha mostra "E-mail ou senha incorretos." e destrava o botão; com sucesso chama `router.replace` com `safeNext(next)` (e com `next=//evil.com` vai para `/`); `cadastrar` com sucesso chama `signUp.email` e depois `organization.create` com nome `Casa de Ana` e slug que começa com `casa-de-ana-`; com `next=/convite/x` **não** cria organização; senha de 7 caracteres não envia; falha na criação da casa mostra a mensagem específica; `nova-conta` cria, ativa a organização (`setActive`) e vai para `/`; lançar erro de rede em `signIn.email` mostra a mensagem de conexão e destrava.
- [ ] **Step 2: Run** `npm test -w apps/app -- auth-screens`. Expected: FAIL.
- [ ] **Step 3: Implement** as telas e o layout `(auth)`.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(app): telas de entrar, cadastrar e nova conta`.

### Task 10: Conferência contra o site e aprovação (com o usuário)

**Files:** nenhum arquivo de código (capturas de tela guardadas fora do repositório).

**Interfaces:** consome todas as tarefas anteriores.

- [ ] **Step 1: Rodar** o app apontando para produção: `EXPO_PUBLIC_API_URL=https://medicron.com.br npx expo start --ios` (simulador de iPhone) e `--web`.
- [ ] **Step 2: Capturas lado a lado** (tela de entrar, cadastrar, nova conta e as abas provisórias; claro e escuro; largura de celular e de desktop) contra `https://medicron.com.br`, no mesmo molde de comparação usado no teste descartável; conferir cores, espaçamento, fonte (Geist), ícones, tamanhos de toque e o teclado em iPhone pequeno (simulador iPhone SE).
- [ ] **Step 3: Teste real de login** feito **pelo usuário** no simulador e na web com a própria conta (o agente não digita credenciais): entrar, ver a casca com o nome da conta, trocar de conta, sair, e abrir `/pacientes` sem sessão para confirmar o retorno ao destino depois do login.
- [ ] **Step 4: Mostrar as capturas ao usuário** e só seguir com a aprovação dele (spec, escolha 12). Ajustes pedidos entram como correções com teste antes de continuar.

### Task 11: Scripts da raiz, documentação e fechamento

**Files:**
- Modify: `package.json` (raiz: `lint` e `typecheck` incluem `apps/app`; `test` já cobre os workspaces), `README.md` (como rodar o app: `npm run start -w apps/app`, variáveis, `sync-tokens`), `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 2 marcada como concluída)

**Interfaces:** consome tudo.

- [ ] **Step 1: Verificar tudo** da raiz: `npm test` (API, shared e app), `npm run lint`, `npm run typecheck`, `npm run build` (API), `npx expo export -p web` em `apps/app`. Expected: tudo verde.
- [ ] **Step 2: Publicar** `vercel --prod --yes` da raiz para confirmar que a API não foi afetada pelo workspace novo (o diretório raiz da Vercel segue `apps/api`) e conferir `/entrar` e `/api/v1/config` em `https://medicron.com.br`.
- [ ] **Step 3: Atualizar** o README e o documento de design e commitar `docs: Etapa 2 concluída e como rodar o app Expo`.
