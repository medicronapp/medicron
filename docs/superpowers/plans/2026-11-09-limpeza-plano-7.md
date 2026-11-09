# Limpeza das pendências menores Implementation Plan (Plano 7)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (execução nativa). Steps use checkbox (`- [ ]`) syntax.

**Goal:** Fechar as pendências menores deixadas pelas revisões dos Planos 1, 5 e 6, sem mudar o comportamento que o usuário já testou.

**Architecture:** Três tarefas independentes (API, textos públicos, app) mais registro de decisões na spec. Cada correção nasce de um teste vermelho.

**Tech Stack:** Next (API, vitest), Expo (jest-expo/RNTL), docs.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md`.

## Global Constraints

- Português do Brasil com acentos; sem segredos no repositório; nenhuma publicação de produção neste plano (a API de `main` só sai depois da semana estável, ver `docs/virada-da-web.md`).
- `apps/app` não pode trazer `lightningcss` diferente de 1.30.1 no lock ao remover dependências.

## Review Focus

1. JSON malformado em qualquer rota continua 400 `invalid_request`, mas um `SyntaxError` de bug interno vira 500 (não mascara).
2. `MIN_APP_VERSION` com lixo não tira todos os clientes do ar: cai em `0.0.0` e registra o erro.
3. Desativar notificações offline na web não mostra "desativado" quando a inscrição continua ativa.
4. Exclusão de conta: só o código `INVALID_PASSWORD` mostra "Senha incorreta."; outro 400 mostra a mensagem genérica.
5. Rota inexistente no app mostra tela em português com caminho de volta.

---

### Task 1: API mais robusta

**Files:** Modify `apps/api/src/lib/api/route.ts`, `apps/api/src/lib/services/account-deletion.ts` (+ usos), `apps/api/.gitignore`/raiz `.gitignore`; Test `apps/api/tests/api/foundation.test.ts`, `apps/api/tests/services/account-deletion.test.ts`.

**Interfaces:** `readJson` converte falha de `req.json()` em `ApiError(400, "invalid_request", "Corpo da requisição inválido.")`; `errorResponse` não trata mais `SyntaxError` genérico. `minAppVersion(): string` valida com `compareVersions(v, "0.0.0")` e devolve `"0.0.0"` (com `console.error`) se inválido. `purgeUserData` devolve `{ deletedOrganizations, leftOrganizations }`.

- [ ] **Step 1: Testes (RED)**: corpo malformado em rota real → 400 `invalid_request`; `SyntaxError` lançado pelo handler → 500 `internal`; `MIN_APP_VERSION="abc"` com `x-app-version: 1.0.0` → handler roda (200) e `console.error` chamado; `leftOrganizations` no teste de exclusão; `git check-ignore apps/api/.env.example` sai com código 1 (arquivo rastreável).
- [ ] **Step 2: Rodar** `npx vitest run tests/api/foundation.test.ts tests/services/account-deletion.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implementar** os itens da seção Interfaces; adicionar `!.env.example` ao `.gitignore` e rastrear `apps/api/.env.example`.
- [ ] **Step 4: Rodar** a suíte da API. Expected: PASS. Commit `fix(api): erros de JSON, versão mínima inválida e nomes`.

### Task 2: Textos públicos fiéis ao que o app faz

**Files:** Modify `apps/api/src/app/privacidade/page.tsx`, `docs/lojas.md`, `docs/passos-do-usuario.md`; Test `apps/api/tests/ui/privacy-page.test.tsx`.

- [ ] **Step 1: Testes (RED)** na página: não contém "criptografada" e diz que a senha é guardada de forma protegida (hash); cita os serviços de push dos navegadores além da Expo; não promete "avisamos no app" (diz que a data é atualizada).
- [ ] **Step 2: Implementar** os textos; em `docs/lojas.md`: classificação etária "definida pelo questionário de cada loja (esperado 12+/Livre)" e "bloco de notificações no topo da tela Conta"; reordenar `docs/passos-do-usuario.md` (D antes de E e F).
- [ ] **Step 3: Rodar** `npx vitest run tests/ui/privacy-page.test.tsx`. Expected: PASS. Commit `docs: política e fichas fiéis ao app`.

### Task 3: App sem arestas

**Files:** Modify `apps/app/src/components/delete-account.tsx`, `apps/app/src/lib/push.web.ts`, `apps/app/src/components/enable-notifications.tsx`, `apps/app/public/index.html`, `apps/app/scripts/vercel-config.ts`, `apps/app/package.json` (+lock); Create `apps/app/src/app/+not-found.tsx`; Test `apps/app/tests/delete-account.test.tsx`, `tests/web-push.test.ts`, `tests/enable-notifications-web.test.tsx`, `tests/not-found.test.tsx`, `tests/web-public.test.ts`.

**Interfaces:** `disablePush(): Promise<void>` na web passa a lançar se a inscrição não pôde ser removida do servidor (a local só é desfeita depois); o nativo mantém a assinatura. `EnableNotifications` só vai a "default" quando `disablePush` resolve; senão `toast.error("Não foi possível desativar agora. Tente de novo.")`. Na web, `no-project` mostra "Notificações indisponíveis neste site." `+not-found.tsx` mostra "Página não encontrada" e botão "Ir para o início" (`Link href="/"`).

- [ ] **Step 1: Testes (RED)**: 400 com `code: "OTHER"` → mensagem genérica, `INVALID_PASSWORD` → "Senha incorreta."; web `disablePush` com fetch falhando rejeita e **não** desinscreve localmente; componente web mostra o toast de erro e continua "enabled"; `no-project` na web mostra a mensagem do site; tela not-found; `index.html` usa `http-equiv`.
- [ ] **Step 2: Rodar** os arquivos. Expected: FAIL.
- [ ] **Step 3: Implementar**; remover `expo-device` (não usado) com `npm uninstall -w @medicron/app expo-device` e conferir `lightningcss` 1.30.1 no lock; comentar no teste/`vercel-config.ts` as limitações do casamento de `source` e do fallback sem ponto.
- [ ] **Step 4: Rodar** `npx jest`, typecheck, lint. Expected: PASS. Commit `fix(app): erros de exclusão, desativar push offline, tela não encontrada`.

### Task 4: Decisões na spec e fechamento

- [ ] **Step 1:** Registrar na spec: (a) tema manual não existe na web de propósito (o escuro segue o navegador); (b) exclusão de conta apaga os dados antes do usuário e não é uma transação só (limitação conhecida); (c) convites pendentes enviados por quem sai de uma conta compartilhada são apagados (inviterId cascade).
- [ ] **Step 2: Verificar** `npm test`, `npx expo export -p web` e `-p ios`, lint e typecheck. **Step 3: Revisão final** independente (modelo mais capaz); corrigir Critical/Important com teste antes. **Step 4: Mesclar** em `main`, sem publicar. Commit `docs: decisões da limpeza`.
