# Hotsite do Medicron Implementation Plan (Plano 10)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execução nativa). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Quem abre `medicron.com.br` sem sessão vê um hotsite minimalista de coluna única que leva a Criar conta e Entrar; quem tem sessão continua indo direto para o app.

**Architecture:** Uma página HTML + CSS estática (gerada na build a partir de um modelo, dos tokens do app e de duas fontes Geist em `woff2`) em `/landing/`. O roteamento é da Vercel, no projeto `medicron-web`: `rewrite` de `/` por cookie de sessão (com sessão ou `?source=pwa`: app; sem: hotsite). Como arquivo estático tem precedência sobre rewrite, o `index.html` do app é renomeado para `app.html` depois do `expo export`.

**Tech Stack:** HTML/CSS escritos à mão, Node (scripts de build em `apps/app/scripts`), Expo web export, Vercel (`vercel.json`), jest-expo (testes dos scripts e do HTML), vitest (teste do cookie na API).

**Spec:** `docs/superpowers/specs/2026-11-10-hotsite-design.md` (direção: minimalista, coluna única).

## Global Constraints

- Português do Brasil com acentos. **Nenhum recurso de terceiros** (fonte, script, imagem, métrica): a política de privacidade diz que não rastreamos. Nenhum JavaScript além do trecho de tema (≤ 600 bytes, em `try/catch`).
- **Nada decorativo:** sem degradê, sombra pesada, ícone em círculo, pílula de rótulo, faixa de CTA, herói centralizado, animações. Uma só cor de ação (o verde do app); vermelho só em "Atrasada".
- **Não prometer o que não existe:** nada de "disponível na App Store/Google Play" antes de as URLs existirem; nada de promessa médica.
- Os tokens vêm do `src/global.css` do app (não copiar valores à mão). Cookie de sessão de produção: `__Secure-better-auth.session_token`.
- Orçamento: HTML + CSS ≤ 25 KB sem compressão; no máximo 2 arquivos de fonte (Geist 400 e 600, `woff2`, ≤ 40 KB cada); LCP sem imagem raster.
- O app para quem está logado não pode ficar mais lento nem mudar. Publicar só o `medicron-web` (a API não é tocada).

## Review Focus

1. **Quem tem sessão nunca vê o hotsite** (o nome do cookie bate com o real do `better-auth`) e **quem não tem nunca cai numa tela em branco**.
2. Links profundos (`/entrar`, `/cadastrar`, `/convite/x`, `/pacientes`) e o fallback do app seguem funcionando com o `index.html` renomeado; `/index.html` redireciona para `/`.
3. PWA instalado com sessão expirada abre o app (tela de entrada), não o hotsite (`start_url` `/?source=pwa`).
4. A linha de disponibilidade e o texto "No iPhone" só afirmam o que existe (com e sem URLs das lojas); o aviso de "organizador de lembretes, não é dispositivo médico" está presente.
5. Tema e fonte: segue o sistema e `localStorage["medicron.theme"]`; fonte com `font-display: swap` e fallback sem salto de layout; nenhuma requisição a outro domínio.

---

### Task 1: A página e o build

**Files:**
- Create: `apps/app/site/index.template.html`, `apps/app/site/site.css`, `apps/app/site/theme.js`, `apps/app/scripts/build-site.ts`, `apps/app/scripts/build-site.cli.ts`
- Modify: `apps/app/package.json` (devDependency `@fontsource/geist`, script `build-site`), `apps/app/.gitignore` (`/public/landing`, `/public/robots.txt`, `/public/sitemap.xml`)
- Test: `apps/app/tests/site.test.ts`

**Interfaces:**
- Produces: `type SiteEnv = { contactEmail?: string; appStoreUrl?: string; playUrl?: string; origin?: string }` (`origin` padrão `https://medicron.com.br`); `extractTokens(globalCss: string): string` (CSS com `:root` claro, `@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){…}}` e `:root[data-theme="dark"]{…}`, só as variáveis que a página usa: `background foreground card muted-foreground border primary primary-foreground brand-soft brand-ink destructive-soft destructive-ink success-soft success-ink radius`); `renderSite(env: SiteEnv): string` (HTML completo); `buildSite(env: SiteEnv, outRoot: string): void` (escreve `landing/index.html`, `landing/fonts/geist-400.woff2` e `geist-600.woff2`, `landing/og.png`, `robots.txt` e `sitemap.xml`, tudo sob `outRoot`).
- Consumes: `apps/app/src/global.css`, `@fontsource/geist/files/geist-latin-{400,600}-normal.woff2`.

- [ ] **Step 1: Testes (RED)** em `site.test.ts` (chamam `renderSite`/`extractTokens`): o texto exato da spec (título, lead, rótulos "Criar conta", "Já tenho conta →", "Em poucas palavras", legenda, rodapé); exatamente 1 `h1`; links: topo "Entrar" → `/entrar`, botão → `/cadastrar`, "Já tenho conta" → `/entrar`, rodapé → `/privacidade`; o exemplo da tela usa Família Souza, Pedro, Ana e Mel e **não contém "Vovó"**; disponibilidade: sem URLs → "Funciona no navegador; aplicativos para iPhone e Android em breve." e nenhum link de loja; com `appStoreUrl`/`playUrl` → "No iPhone, no Android e no navegador." e os links; "Contato" só com `contactEmail` (`mailto:`); `extractTokens` devolve os valores do `global.css` real (compara `--primary` claro e escuro) e as três regras de tema; nenhuma ocorrência de `http` para outro host (só o `origin`), `<script src`, `<link rel="stylesheet" href="http`, `@import url(`; `gradient` não aparece no CSS; `buildSite` escreve os arquivos esperados num diretório temporário e as fontes têm ≤ 40 KB.
- [ ] **Step 2: Rodar** `npx jest tests/site.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar.** O modelo usa `{{TOKENS}}`, `{{CSS}}`, `{{THEME_JS}}`, `{{AVAILABILITY}}`, `{{STORES}}`, `{{CONTACT}}`, `{{ORIGIN}}`; a tela do app é HTML/CSS com os mesmos tokens (`role="img"` com `aria-label` descrevendo a tela, conteúdo interno `aria-hidden`). Fontes: `@font-face` com `font-display: swap` e `size-adjust` no fallback do sistema. CSS conforme a seção "Visual" da spec.
- [ ] **Step 4: Rodar** o teste. Expected: PASS. Commit `feat(app): hotsite (página e build)`.

### Task 2: SEO e compartilhamento

**Files:** Modify `apps/app/site/index.template.html`, `apps/app/scripts/build-site.ts`; Create `apps/app/site/og.svg`, `apps/app/scripts/build-og.cli.ts`, `apps/app/site/og.png` (gerado e versionado); Test `apps/app/tests/site-seo.test.ts`.

**Interfaces:** `scripts/build-og.cli.ts` gera `og.png` (1200×630) do `og.svg` com `@resvg/resvg-js` (devDependency) e a Geist 600 embutida; `renderSite` passa a emitir as metas abaixo.

- [ ] **Step 1: Testes (RED):** `<html lang="pt-BR">`; `title` ≤ 60 caracteres e `meta description` ≤ 160 (sem promessa médica); `link rel="canonical"` = `${origin}/`; Open Graph (`og:title`, `og:description`, `og:type=website`, `og:url`, `og:image` absoluto, `og:locale=pt_BR`) e `twitter:card=summary_large_image`; `theme-color` claro e escuro por `media`; JSON-LD `SoftwareApplication` válido (JSON.parse) com `name`, `applicationCategory: "HealthApplication"`, `offers.price "0"`, sem `aggregateRating`; `robots.txt` permite `/` e aponta o sitemap; `sitemap.xml` lista `/` e `/privacidade`; `og.png` existe, é PNG 1200×630 (lê o cabeçalho IHDR).
- [ ] **Step 2: Rodar.** Expected: FAIL. **Step 3: Implementar** (`og.svg`: fundo do app, logo, a frase do título; `npm run build-og`). **Step 4: Rodar.** Expected: PASS. Commit `feat(app): metas, imagem de compartilhamento, robots e sitemap do hotsite`.

### Task 3: Roteamento e finalização do build

**Files:** Modify `apps/app/scripts/vercel-config.ts`, `apps/app/vercel.json` (gerado), `apps/app/public/manifest.webmanifest`, `apps/app/package.json` (`build:web`); Create `apps/app/scripts/finalize-web.ts`, `apps/app/scripts/finalize-web.cli.ts`, `apps/api/tests/session-cookie.test.ts`; Test `apps/app/tests/vercel-web.test.ts` (estende), `apps/app/tests/finalize-web.test.ts`.

**Interfaces:**
- `export const SESSION_COOKIE = "__Secure-better-auth.session_token"` em `vercel-config.ts`.
- `buildVercelConfig(apiOrigin)`: ordem das reescritas: API (`/api/:path*`, `/privacidade`, `/.well-known/:path*`); `{ source: "/", has: [{ type: "query", key: "source", value: "pwa" }], destination: "/app.html" }`; `{ source: "/", has: [{ type: "cookie", key: SESSION_COOKIE }], destination: "/app.html" }`; `{ source: "/", destination: "/landing/index.html" }`; fallback do app `/((?!.*\\.[a-zA-Z0-9]+$).*)` → `/app.html`. Redirecionamento permanente `/index.html` → `/`. Cabeçalho `Cache-Control: public, max-age=31536000, immutable` em `/landing/fonts/:file`. `buildCommand`: `node scripts/build-site.cli.ts && npx expo export -p web && node scripts/finalize-web.cli.ts`.
- `finalizeWeb(distDir: string): void`: renomeia `index.html` → `app.html`; lança se `index.html` não existir, se `app.html` já existir ou se `landing/index.html` não existir.
- Manifesto: `start_url` e o atalho "Hoje" viram `/?source=pwa`.

- [ ] **Step 1: Testes (RED):** a ordem das reescritas (API, `?source=pwa`, cookie, hotsite, fallback); simulação do casamento: `/` com cookie → `/app.html`, `/` sem cookie → `/landing/index.html`, `/?source=pwa` sem cookie → `/app.html`, `/entrar`, `/cadastrar`, `/convite/x`, `/pacientes` → `/app.html`, `/sw.js` e `/landing/fonts/geist-400.woff2` não casam com nenhuma reescritura; `/index.html` redireciona para `/`; o `vercel.json` do disco é igual ao gerado; `finalizeWeb` num diretório temporário (sucesso e os três erros); `start_url` do manifesto. **API (vitest):** o nome do cookie de sessão calculado pelo `better-auth` real em produção (`getCookies(auth.options).sessionToken.name` com `NODE_ENV=production`) é igual a `SESSION_COOKIE` (lido do `apps/app/scripts/vercel-config.ts`) e aparece no `apps/app/vercel.json`.
- [ ] **Step 2: Rodar.** Expected: FAIL. **Step 3: Implementar**; regenerar `vercel.json` (`npm run vercel-config`). **Step 4: Rodar** `npx jest`, `npm run build:web` (gera `dist/app.html`, `dist/landing/index.html`, sem `dist/index.html`). Expected: PASS. Commit `feat(app): roteamento do hotsite por cookie e app.html`.

### Task 4: Acessibilidade, tema e orçamento

**Files:** Modify `apps/app/site/index.template.html`, `apps/app/site/site.css`, `apps/app/site/theme.js`; Test `apps/app/tests/site-quality.test.ts`.

- [ ] **Step 1: Testes (RED):** marcos `header`, `main`, `footer`; link "Pular para o conteúdo" como primeiro foco; foco visível (`:focus-visible` com contorno de 2 px); alvos de toque do botão e dos links ≥ 44 px (CSS: `min-height`); contraste ≥ 4,5 dos pares texto/fundo usados, claro e escuro, calculados dos tokens (reusa a conversão oklch do `tokens.test.ts`: foreground/background, muted-foreground/background, primary-foreground/primary, brand-ink/brand-soft, destructive-ink/destructive-soft, success-ink/success-soft); `theme.js` ≤ 600 bytes, em `try/catch`, lê `localStorage["medicron.theme"]` e só aceita `"light"`/`"dark"`; a página não tem `animation`/`transition`; `@media (prefers-reduced-motion)` não é necessário; orçamento: HTML + CSS ≤ 25 KB, no máximo 2 `@font-face`, nenhuma imagem raster no corpo.
- [ ] **Step 2: Rodar.** Expected: FAIL. **Step 3: Ajustar** a página até passar. **Step 4: Rodar** `npx jest`. Expected: PASS. Commit `fix(app): acessibilidade, tema e orçamento do hotsite`.

### Task 5: Publicação, verificação e fechamento

- [ ] **Step 1: Pré-visualização** do `medicron-web` (`vercel deploy`, sem `--prod`) e verificação com `vercel curl`: `/` sem cookie → hotsite (`<h1>Lembretes de remédio…`); `/` com `Cookie: __Secure-better-auth.session_token=x` → app (`<div id="root">`); `/?source=pwa` → app; `/entrar`, `/cadastrar`, `/convite/x`, `/pacientes` → app; `/index.html` → 308 para `/`; `/landing/fonts/geist-400.woff2` → 200 com cache imutável; `/robots.txt`, `/sitemap.xml`, `/landing/og.png` → 200; `/api/v1/config` e `/privacidade` continuam vindo da API.
- [ ] **Step 2: Publicar** o `medicron-web` em produção e repetir as verificações em `https://medicron.com.br`; conferir no navegador, com a sessão do usuário, que `/` abre o app (ele já está logado) e, numa janela anônima, o hotsite, em claro e escuro, no celular e no computador (Lighthouse de desempenho e acessibilidade ≥ 95).
- [ ] **Step 3: Docs:** `docs/lojas.md` (URL de marketing `https://medicron.com.br`, URL de suporte), `docs/passos-do-usuario.md` (definir `CONTACT_EMAIL`, `LANDING_APP_STORE_URL` e `LANDING_PLAY_URL` no projeto `medicron-web` quando existirem e republicar; capturas reais opcionais), README (estado do app) e a spec (status "implementado").
- [ ] **Step 4: Verificar** `npm test`, lint, typecheck, exports web e iOS. **Step 5: Revisão final** independente (modelo mais capaz); corrigir Critical e Important com teste antes. **Step 6: Mesclar** em `main`. Commit `docs: hotsite publicado`.
