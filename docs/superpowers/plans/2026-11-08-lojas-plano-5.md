# Plano 5 — Preparação para as lojas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar no repositório tudo o que a App Store e o Google Play exigem e que não depende de conta ou de aparelho: exclusão de conta dentro do app, política de privacidade pública, links universais (abrir o convite direto no app), configuração de build do EAS e o texto das fichas das lojas. O que depende de contas (Apple, Google, EAS) fica num guia passo a passo.

**Architecture:** A exclusão de conta usa o recurso `deleteUser` do `better-auth` (com confirmação por senha) e um gancho `beforeDelete` que apaga ou repassa os dados do app. A política de privacidade e os arquivos de links universais (`apple-app-site-association`, `assetlinks.json`) são rotas públicas da API (Next), configuradas por variáveis de ambiente. `app.json` e `eas.json` ganham os identificadores, as versões e os domínios associados.

**Tech Stack:** `better-auth` (`user.deleteUser`), Drizzle/PGlite, Next route handlers, Expo config (`app.json`, `eas.json`), jest-expo.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 5; escolha 15). Base: Planos 1 a 4, em `main`.

## Global Constraints

- Textos em pt-BR, com acentuação correta.
- Sem segredos, senhas, tokens ou identificadores pessoais no repositório (Team ID da Apple, impressão digital SHA-256 do Android e e-mail de contato entram por **variáveis de ambiente**).
- Exclusão de conta: exige a senha; **nada é apagado** se a senha estiver errada; a operação é atômica (transação): falha no meio não deixa dados pela metade.
- A migração `0008` (Plano 4) continua pendente e a exclusão de conta apaga também `push_devices`: **este plano não é publicado** antes de a `0008` estar aplicada.
- Rotas públicas novas (`/privacidade`, `/.well-known/*`) precisam passar pelo `proxy.ts` sem exigir login e sem redirecionar.
- TDD em cada tarefa; `npm test` da raiz fica verde; typecheck, lint, `build` e `expo export -p web` e `-p ios` limpos.
- Fora do escopo (dependem de você): criar/configurar contas e certificados, `eas build`, `eas submit`, capturas de tela, preencher os formulários das lojas, teste fechado de 12 testadores (se a conta do Google exigir).

## Review Focus

1. **Exclusão — dados que sobram ou somem a mais:** conta única de um usuário (apaga a organização e **tudo** dela: pacientes, itens, rotinas, horários, doses, convites); conta com outras pessoas (os dados ficam; se o usuário era o único dono, alguém vira dono; nenhum dado de outra organização é tocado); aparelhos e inscrições de push do usuário somem; usuário sem nenhuma conta; usuário que é membro de duas contas (uma só dele, outra compartilhada).
2. **Exclusão — segurança:** senha errada não apaga nada nem inicia a operação; sem sessão não exclui; a transação desfaz tudo se falhar; o histórico de doses registrado por quem saiu continua legível (aparece sem nome).
3. **App:** o fluxo "Excluir conta" tem confirmação com senha, não permite toque duplo, mostra erro de senha e de rede sem travar, e ao concluir leva à tela de entrar com o cache limpo e o aparelho desregistrado do push.
4. **Links universais:** os arquivos `apple-app-site-association` e `assetlinks.json` respondem `200` com `application/json`, **sem redirecionar** e sem login; sem as variáveis de ambiente respondem `404` (nunca um JSON incompleto); o `proxy.ts` deixa `/privacidade` e `/.well-known/*` passarem.
5. **Política de privacidade:** pública (sem sessão), em português, descreve o que o app realmente guarda (nome, e-mail, dados de pacientes/itens/rotinas, registros de dose, token de notificação, cookie/sessão), com quem compartilha (provedores de hospedagem, banco e envio de notificações), como pedir exclusão (no app e por contato) e a data da última atualização.
6. **Configuração das lojas:** identificadores `app.medicron`, esquema `medicron`, sem suporte a tablet, domínio associado `medicron.com.br`, filtro de intenção do Android só para `/convite`, `ITSAppUsesNonExemptEncryption` falso, versões e `autoIncrement` no perfil de produção.

---

### Task 1: Apagar os dados de uma conta de usuário (serviço)

**Files:**
- Create: `apps/api/src/lib/services/account-deletion.ts`
- Test: `apps/api/tests/services/account-deletion.test.ts`

**Interfaces:**
- Consumes: `Db`, tabelas (`organization`, `member`, `invitation`, `patients`, `items`, `carePlans`, `careSlots`, `doseLogs`, `pushSubscriptions`, `pushDevices`).
- Produces: `purgeUserData(db: Db, userId: string): Promise<{ deletedOrganizations: string[]; transferredOrganizations: string[] }>` — em **uma transação**: para cada organização do usuário: se ele é o **único membro**, apaga os dados da organização (doses, horários, rotinas, pacientes, itens, nessa ordem) e a organização (convites e vínculos saem em cascata); se há **outros membros**, e o usuário é dono sem outro dono, promove a dono o membro mais antigo (preferindo administradores) — em seguida remove o vínculo do usuário; por fim apaga as inscrições de Web Push e os aparelhos do usuário. Não apaga o usuário em si (o `better-auth` faz isso depois).

- [ ] **Step 1: Write the failing test** (PGlite, `createTestDb`) — usuário único dono: some a organização e todos os dados (conferir **todas** as tabelas filhas), nada de outra organização é tocado; organização com outro membro: dados ficam, o outro vira dono quando o usuário era o único dono, nada muda de dono quando já havia outro dono, e o vínculo do usuário some; membro `admin` é preferido ao `member` na promoção; usuário em duas organizações (uma só dele, outra compartilhada): só a dele é apagada; usuário sem organização não falha; inscrições de Web Push e aparelhos nativos do usuário somem e os de outros ficam; convites pendentes da organização apagada somem; atomicidade (forçar falha no meio com uma tabela inexistente simulada ou erro injetado e conferir que nada foi apagado); o retorno lista as organizações apagadas e as repassadas.
- [ ] **Step 2: Run** `cd apps/api && npx vitest run tests/services/account-deletion.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `purgeUserData` com `db.transaction`.
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(api): apagar os dados de uma conta de usuário`.

### Task 2: Excluir a conta pelo `better-auth` (com senha)

**Files:**
- Modify: `apps/api/src/lib/auth.ts` (`user: { deleteUser: { enabled: true, beforeDelete } }`)
- Test: `apps/api/tests/auth-delete-user.test.ts`

**Interfaces:**
- Consumes: `purgeUserData` (T1).
- Produces: `POST /api/auth/delete-user` habilitado: com a senha certa, executa `purgeUserData` e depois apaga o usuário (sessões e contas saem em cascata); com a senha errada devolve erro e **não** chama `purgeUserData` nem apaga nada; sem sessão devolve 401. O cliente chama `authClient.deleteUser({ password })` (Tarefa 3).

- [ ] **Step 1: Write the failing test** — no molde de `auth-expo.test.ts` (PGlite + `auth.handler`): criar usuário por `sign-up/email` com origem `medicron://`, criar organização e um paciente; `delete-user` com **senha errada** → erro e o usuário, a organização e o paciente continuam; com a **senha certa** → 200, usuário, sessões, organização (única do usuário) e dados somem; usuário em organização compartilhada → o usuário some e a organização e os dados ficam, com o outro membro como dono; sem cookie de sessão → 401.
- [ ] **Step 2: Run** `cd apps/api && npx vitest run tests/auth-delete-user.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** a configuração em `createAuth` (o `beforeDelete` recebe o usuário e chama `purgeUserData(db, user.id)`).
- [ ] **Step 4: Run** `npm test` na raiz. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(api): exclusão de conta com senha`.

### Task 3: "Excluir conta" no app

**Files:**
- Create: `apps/app/src/components/delete-account.tsx`
- Modify: `apps/app/src/app/(app)/conta.tsx` (cartão no fim da tela)
- Test: `apps/app/tests/delete-account.test.tsx`; ampliar `apps/app/tests/conta-screen.test.tsx`

**Interfaces:**
- Consumes: `authClient.deleteUser`, `unregisterThisDevice` (Plano 4), `queryClient`, `Drawer`, `FormField`, `PasswordInput`, `Button`, `Alert`, `toast`.
- Produces: cartão "Excluir conta" com a descrição "Apaga o seu acesso e os seus dados. Se você for a única pessoa de uma conta, os pacientes, itens e rotinas dela também serão apagados. Isso não pode ser desfeito." e o botão destrutivo "Excluir minha conta". Ao tocar abre um sheet: título "Excluir sua conta?", a mesma descrição, campo "Senha" (`PasswordInput`), botões "Cancelar" e "Excluir conta" (destrutivo; desabilitado com a senha vazia e enquanto envia; duplo toque envia uma vez). Fluxo: `unregisterThisDevice()` → `authClient.deleteUser({ password })`; sucesso: esvazia o cache, fecha o sheet e a sessão some (a guarda leva a `/entrar`); senha errada mostra "Senha incorreta." no campo e mantém o sheet; erro de rede mostra `NETWORK_MESSAGE` e destrava; nada some da tela antes da resposta.

- [ ] **Step 1: Write the failing test** — cartão e textos; abrir o sheet; botão desabilitado sem senha; senha errada mostra "Senha incorreta." sem fechar nem limpar o cache; sucesso chama o desregistro do push **antes** de `deleteUser`, limpa o cache e fecha; duplo toque chama `deleteUser` uma vez; erro de rede mostra a mensagem e destrava; cancelar fecha sem chamar nada; o cartão aparece na Conta para qualquer papel (dono, administrador e membro).
- [ ] **Step 2: Run** `npm test -w apps/app -- delete-account conta-screen`. Expected: FAIL.
- [ ] **Step 3: Implement** o componente e o ponto de uso.
- [ ] **Step 4: Run** `npm test` na raiz, `npm run typecheck`, `npm run lint`, `npx expo export -p web` e `-p ios`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(app): excluir a própria conta`.

### Task 4: Política de privacidade e links universais (rotas públicas)

**Files:**
- Create: `apps/api/src/app/privacidade/page.tsx`, `apps/api/src/app/.well-known/apple-app-site-association/route.ts`, `apps/api/src/app/.well-known/assetlinks.json/route.ts`, `apps/api/src/lib/app-links.ts`
- Modify: `apps/api/src/proxy.ts` (matcher: `privacidade` e `\\.well-known`), `apps/api/.env.example` (`APPLE_TEAM_ID`, `ANDROID_SHA256_CERT_FINGERPRINTS`, `CONTACT_EMAIL`)
- Test: `apps/api/tests/app-links.test.ts`, `apps/api/tests/proxy-public.test.ts`, `apps/api/tests/privacy-page.test.ts` (ou `ui/`, no padrão dos testes de página existentes)

**Interfaces:**
- Produces:
  - `appleAppSiteAssociation(env)` → `{ applinks: { details: [{ appIDs: ["<TEAM>.app.medicron"], components: [{ "/": "/convite/*" }] }] } }` ou `null` sem `APPLE_TEAM_ID`; `assetLinks(env)` → `[{ relation: ["delegate_permission/common.handle_all_urls"], target: { namespace: "android_app", package_name: "app.medicron", sha256_cert_fingerprints: [...] } }]` ou `null` sem `ANDROID_SHA256_CERT_FINGERPRINTS` (lista separada por vírgula, aparada).
  - As duas rotas devolvem `200` com `content-type: application/json` e o corpo acima, ou `404` quando não configuradas; sem redirecionamento e sem login.
  - `proxy.ts` deixa `/privacidade`, `/.well-known/apple-app-site-association` e `/.well-known/assetlinks.json` passarem sem sessão.
  - Página `/privacidade` (pública, em português, `<h1>` "Política de privacidade", data da última atualização): quem somos e o contato (`CONTACT_EMAIL`, com texto alternativo se ausente), que dados são coletados e para quê (nome e e-mail da conta; dados de pacientes, itens e rotinas que a pessoa cadastra; registros de dose; token de notificação do aparelho; cookie de sessão), com quem são compartilhados (hospedagem, banco de dados e envio de notificações, apenas para operar o serviço; sem venda nem publicidade), por quanto tempo ficam, como excluir (no app: Conta → Excluir conta; ou por contato), direitos do titular (LGPD) e crianças.

- [ ] **Step 1: Write the failing test** — `appleAppSiteAssociation` e `assetLinks` com e sem variáveis, com vários fingerprints e espaços; rotas: `200` + `application/json` + corpo certo, `404` sem configuração, sem `Location`; `proxy`: a função (`proxy` + `config.matcher`) não redireciona `/privacidade` nem `/.well-known/...` e **continua** redirecionando `/pacientes` sem cookie; página: renderiza o título, a data, a menção a "Excluir conta" e os provedores, e usa o `CONTACT_EMAIL` quando definido.
- [ ] **Step 2: Run** `cd apps/api && npx vitest run tests/app-links.test.ts tests/proxy-public.test.ts tests/privacy-page.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** as rotas, o módulo, a página e o ajuste do `proxy.ts`.
- [ ] **Step 4: Run** `npm test` na raiz e `npm run build`. Expected: tudo verde.
- [ ] **Step 5: Commit** `feat(api): política de privacidade e arquivos de links universais`.

### Task 5: Configuração do app para as lojas (`app.json` e `eas.json`)

**Files:**
- Modify: `apps/app/app.json`
- Create: `apps/app/eas.json`
- Test: `apps/app/tests/store-config.test.ts`

**Interfaces:**
- Produces:
  - `app.json`: `version "1.0.0"`; `ios`: `bundleIdentifier "app.medicron"`, `buildNumber "1"`, `supportsTablet false`, `associatedDomains ["applinks:medicron.com.br"]`, `infoPlist.ITSAppUsesNonExemptEncryption false`; `android`: `package "app.medicron"`, `versionCode 1`, `intentFilters` com um filtro `VIEW` (`autoVerify true`, categorias `BROWSABLE` e `DEFAULT`) para `https://medicron.com.br` com `pathPrefix "/convite"`; `orientation "portrait"`; `scheme "medicron"` mantido.
  - `eas.json`: `cli.appVersionSource "remote"`; perfis `development` (`developmentClient true`, `distribution "internal"`), `preview` (`distribution "internal"`), `production` (`autoIncrement true`); `submit.production` vazio (campos preenchidos pelo usuário). Cada perfil define `EXPO_PUBLIC_API_URL` apontando para `https://medicron.com.br`.

- [ ] **Step 1: Write the failing test** — lê `app.json` e `eas.json` e confere cada campo acima (identificadores iguais nas duas plataformas, o esquema, o domínio associado, o filtro do Android só para `/convite`, `supportsTablet false`, a chave de criptografia, `autoIncrement` em produção, `EXPO_PUBLIC_API_URL` em todos os perfis); confere também que nenhum arquivo de configuração contém `projectId` fixo inventado, chaves privadas ou `google-services.json` referenciado inexistente.
- [ ] **Step 2: Run** `npm test -w apps/app -- store-config`. Expected: FAIL.
- [ ] **Step 3: Implement** os dois arquivos.
- [ ] **Step 4: Run** `npm test` na raiz e `npx expo export -p ios` e `-p web`. Expected: tudo verde; `npx expo config --type public` (em `apps/app`) imprime a configuração sem erro.
- [ ] **Step 5: Commit** `feat(app): configuração de build e links para as lojas`.

### Task 6: Fichas das lojas e guia passo a passo

**Files:**
- Create: `docs/lojas.md`
- Modify: `docs/passos-do-usuario.md`, `README.md`, `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapa 5: preparação concluída; envio depende do usuário)

- [ ] **Step 1: Escrever** `docs/lojas.md` com: nome, subtítulo e descrição curta e longa em pt-BR (honestos e sem promessa médica), palavras-chave, categoria, classificação etária e as respostas prontas dos questionários de privacidade (App Privacy da Apple e Segurança dos dados do Google: dados coletados, finalidade, vinculados ao usuário, sem rastreamento, criptografia em trânsito, exclusão pelo app); notas para a revisão (conta de demonstração a criar pelo usuário, como chegar às telas, onde excluir a conta, notificações); lista de capturas de tela por tamanho; URLs a informar (política de privacidade `https://medicron.com.br/privacidade`, suporte); aviso de que o Medicron não é dispositivo médico.
- [ ] **Step 2: Atualizar** `docs/passos-do-usuario.md` com os passos das lojas, em ordem e com comandos: variáveis na Vercel (`APPLE_TEAM_ID`, `ANDROID_SHA256_CERT_FINGERPRINTS`, `CONTACT_EMAIL`); conferência dos arquivos `/.well-known/*` em produção; `eas build --profile production` (iOS e Android); `eas submit`; TestFlight e faixa interna do Google Play; teste fechado de 12 testadores por 14 dias **se** a conta do Google exigir; revisão das lojas; onde conferir a política e a exclusão de conta.
- [ ] **Step 3: Verificar** da raiz: `npm test`, `npm run lint`, `npm run typecheck`, `npm run build`, `npx expo export -p web` e `-p ios`. Expected: tudo verde.
- [ ] **Step 4: Revisão final** da branch por um revisor independente (modelo mais capaz); corrigir Critical e Important com teste antes; Minor ao ledger.
- [ ] **Step 5: Mesclar** em `main`; **não publicar** (migração `0008` pendente); commit `docs: fichas das lojas e guia de envio`.
