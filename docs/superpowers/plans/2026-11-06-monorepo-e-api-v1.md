# Monorepo, domínio e API v1 (Etapas 0 e 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganizar o repositório em monorepo, ligar `medicron.com.br` ao projeto atual e expor toda a leitura e escrita do app como uma API REST `/api/v1`, sem mudar nada do que o usuário vê hoje.

**Architecture:** O Next.js atual vira `apps/api` (as telas continuam funcionando até a virada). Um pacote `packages/shared` guarda tipos e schemas de requisição usados pelo futuro app Expo. Route Handlers finos sob `/api/v1` chamam os serviços de `src/lib/services/*`, que não mudam. O `better-auth` ganha o plugin do Expo e as origens confiáveis do app nativo.

**Tech Stack:** npm workspaces, Next.js 16.4.5 (Route Handlers), Drizzle + PGlite nos testes, zod 4, vitest 5, better-auth 1.7.x + `@better-auth/expo`.

**Spec:** `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md` (Etapas 0 e 1). Este plano não cria o app Expo (Plano 2). Ficam para os planos seguintes: a reescrita `/api/*` do site estático e as URLs por ambiente do app (`EXPO_PUBLIC_API_URL`), porque ainda não existe site estático nem app.

## Global Constraints

- `src/lib/services/*` e os testes de serviços **ficam como estão**: nenhuma regra de negócio muda.
- Endpoints sob `/api/v1`, mudando **apenas de forma aditiva**; o app envia `x-app-version` e a API tem uma versão mínima aceita (spec, escolha 14).
- Domínio de produção `medicron.com.br`; `medicron.vercel.app` redireciona para ele (spec, escolha do domínio).
- `www.medicron.com.br` redireciona para `medicron.com.br`.
- O Next atual continua em produção durante toda a migração, **sem janela fora do ar**.
- Textos de erro da API em português do Brasil, com acentuação correta.
- Antes de usar qualquer API do Next.js, ler o guia em `node_modules/next/dist/docs/` (AGENTS.md: este Next tem mudanças que quebram o que se conhece).
- Esquema de links do app nativo: `medicron://` (o identificador do app é `app.medicron`).
- Ações que mudam produção (diretório raiz do projeto na Vercel, domínio, variáveis de ambiente, deploy) **exigem OK explícito do usuário** na hora; o plano marca essas tarefas.
- Commits em português (`feat:`, `refactor:`, `test:`, `chore:`), terminando com a linha `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Gerenciador de pacotes: npm workspaces (sem Turborepo/pnpm, escolha minha, a mais simples para 3 pacotes).

## Contrato da API (referência para as Tarefas 5 a 9)

Corpo e resposta em JSON; datas em texto ISO 8601 UTC. Erros: `{ "error": "<código>", "message"?: "<pt-BR>", "issues"?: [...] }`. Autenticação: cookie de sessão (web) ou cabeçalho `Cookie` (nativo).

| Método e caminho | Corpo | Sucesso | Erros |
|---|---|---|---|
| `GET /me` | – | 200 `{ user: {id,name,email}, orgId, role }` | 401, 403 |
| `GET /config` | – | 200 `{ minAppVersion }` (sem login, sem verificação de versão) | – |
| `GET /home?dia=YYYY-MM-DD` | – | 200 `{ home, hasPatients, onboarding }` (`home` no formato de `serializeHome`) | 401, 403 |
| `GET /patients` | – | 200 `{ patients: PatientDto[] }` | |
| `POST /patients` | `{ name, species, birthDate?, weightKg?, notes? }` | 201 `{ patient }` | 400 |
| `GET /patients/:id` | – | 200 `{ patient }` | 404 |
| `PATCH /patients/:id` | mesmo corpo do POST | 200 `{ patient }` | 400, 404 |
| `DELETE /patients/:id` | – | 204 (arquiva) | |
| `GET /patients/:id/plans` | – | 200 `{ plans: PlanDto[] }` (rotinas ativas, com `item`) | 404 |
| `POST /patients/:id/plans` | `{ itemId, intervalMinutes, anchorAt, endAt?, dose?, reschedule? }` | 201 `{ plan }` | 400, 404 |
| `PATCH /plans/:id` | `{ dose?, endAt? (ISO ou null), reschedule? }` | 200 `{ plan }` | 400, 404, 422 `end_before_next_dose` |
| `DELETE /plans/:id` | – | 204 (encerra) | |
| `GET /items?kind=medication\|procedure` | – | 200 `{ items: ItemDto[] }` | |
| `POST /items` | `{ name, kind, defaultDose?, notes? }` | 201 `{ item }` | 400 |
| `GET /items/:id` · `PATCH` · `DELETE` | PATCH como o POST | 200 `{ item }` · 200 · 204 | 400, 404 |
| `POST /doses` | `{ planId, scheduledFor, outcome: "done"\|"skipped", value?, note?, appliedAt? }` | 200 `{ recorded: boolean, reason?: "already" }` | 404, 409 `too_early`, 422 `invalid_applied_at` |
| `POST /onboarding/welcome` | – | 204 | |
| `POST /onboarding/checklist/dismiss` | – | 204 | |

Códigos de erro gerais: 400 `invalid_request` (com `issues`), 401 `unauthorized`, 403 `no_organization` ou `forbidden`, 404 `not_found`, 426 `app_outdated` (com `minAppVersion`), 400 `invalid_app_version`, 500 `internal`.

## Review Focus

- Chamada sem sessão devolve **401 em JSON**, nunca redireciona para `/entrar` (o `getOrgContext` das telas redireciona; a API não pode).
- Recurso de **outra organização** devolve 404 (não 403, para não vazar a existência).
- Corpo JSON malformado ou campos inválidos devolvem 400 com `issues`, **nunca 500**.
- `x-app-version` antigo devolve 426; **ausente (web) é aceito**; lixo (`"abc"`) devolve 400.
- Registrar a mesma dose duas vezes devolve 200 com `recorded:false`, e dose adiantada devolve 409, ambos sem corromper o horário.
- Arquivar ou encerrar duas vezes é idempotente (204 nas duas).

## File Structure

```
package.json                     raiz do workspace (scripts que delegam a apps/api)
apps/api/                        o Next.js atual (src, tests, public, drizzle, configs, .env*)
packages/shared/                 @medicron/shared: tipos, schemas de requisição, compareVersions
apps/api/src/lib/api/context.ts  getApiContext() (401/403 em vez de redirecionar) e ApiError
apps/api/src/lib/api/route.ts    route(): verificação de versão + mapeamento de erros para JSON
apps/api/src/lib/api/dto.ts      mapeadores linha do banco → DTO (datas em ISO)
apps/api/src/app/api/v1/**       Route Handlers finos
apps/api/tests/api/**            testes de rota (PGlite + mocks de getDb e getApiContext)
```

---

### Task 1: Mover o app para `apps/api` e criar o workspace

**Files:**
- Move (com `git mv`) para `apps/api/`: `src`, `tests`, `public`, `drizzle`, `next.config.ts`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.mjs`, `drizzle.config.ts`, `components.json`, `vercel.ts`, `next-env.d.ts`, `AGENTS.md`, `.env.example`, `package.json`.
- Mover à mão (arquivo não versionado): `.env.local` → `apps/api/.env.local`.
- Create: `package.json` (raiz), ajustar `.gitignore` (trocar `/node_modules`, `/.next/`, `/out/`, `/build`, `/coverage` por versões sem a barra inicial).
- Fica na raiz: `docs/`, `README.md`, `.vercel/`, `.gitignore`.

**Interfaces:**
- Produces: raiz com `workspaces: ["apps/*", "packages/*"]`; scripts da raiz `dev`, `build`, `lint`, `test`, `db:generate`, `db:migrate` que delegam a `apps/api` (`npm run <x> -w apps/api`; `test` usa `npm test --workspaces --if-present`). `apps/api/package.json` com `"name": "@medicron/api"` e o resto igual ao atual.

- [ ] **Step 1: Registrar a linha de base.** Rodar `npx vitest run` e anotar o resultado. Expected: 258 testes passando.
- [ ] **Step 2: Mover** com `git mv` os arquivos listados, mover `.env.local` e criar o `package.json` da raiz. Remover `tsconfig.tsbuildinfo` da raiz se estiver versionado (não deve estar).
- [ ] **Step 3: Instalar** com `npm install` na raiz (gera o `package-lock.json` do workspace). Se o build avisar sobre a raiz do workspace, definir `turbopack.root` e `outputFileTracingRoot` em `apps/api/next.config.ts` apontando para a raiz do repositório.
- [ ] **Step 4: Verificar.** Rodar, da raiz: `npm test`, `npm run lint`, `npm run build`, `npx tsc --noEmit -p apps/api`. Expected: os mesmos 258 testes passando; lint e build sem erros; tsc limpo.
- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "refactor: monorepo com o app Next em apps/api"
```

### Task 2: Apontar a Vercel para `apps/api` e confirmar o deploy (pede OK ao usuário)

**Files:** nenhum arquivo do código; muda a configuração do projeto na Vercel.

**Interfaces:**
- Consumes: Task 1 mesclada em `main`.
- Produces: projeto Vercel com `rootDirectory = apps/api` e "Include source files outside of the Root Directory" ligado; produção servida a partir do monorepo.

- [ ] **Step 1: Pedir OK ao usuário** para alterar o diretório raiz do projeto `medicron` na Vercel para `apps/api` e fazer um deploy de produção. Explicar: um build que falhe não promove nada, a produção atual continua no ar.
- [ ] **Step 2: Alterar** o diretório raiz do projeto (painel, `vercel project`, ou a ferramenta `update_project` do MCP da Vercel) e manter `.vercel/project.json` na raiz do repositório.
- [ ] **Step 3: Deploy** com `vercel --prod --yes` a partir da raiz.
- [ ] **Step 4: Verificar.** `vercel ls` mostra o novo deploy `Ready` em Production; `curl -s -o /dev/null -w "%{http_code}" https://medicron.vercel.app/entrar` devolve 200; `/` sem login devolve 307 para `/entrar`.
- [ ] **Step 5: Plano de volta, se falhar:** o alias de produção continua no deploy anterior; reverter o diretório raiz para vazio e investigar o log do build.

### Task 3: Domínio `medicron.com.br` e redirecionamentos (pede OK ao usuário)

**Files:**
- Modify: `apps/api/vercel.ts` (regra de redirecionamento do host antigo)
- Test: `apps/api/tests/vercel-config.test.ts`

**Interfaces:**
- Consumes: Task 2 concluída; o usuário registrou o domínio e criou os registros `A` e `CNAME` no registro.br.
- Produces: `config.redirects` com um redirecionamento **temporário (307)** de `medicron.vercel.app` para `https://medicron.com.br`, preservando o caminho e **excluindo `/api/cron/`** (decidido na revisão final: 308 fica no cache dos navegadores para sempre, e o agendador dos lembretes perderia o `Authorization` ao ser redirecionado).

- [ ] **Step 1: Write the failing test** (`vercel-config.test.ts`): importar `config` de `../vercel` e afirmar que existe um item em `config.redirects` com `has: [{ type: "host", value: "medicron.vercel.app" }]`, `destination` começando em `https://medicron.com.br`, `permanent: false`, e `source` que não casa `api/cron/dispatch`.
- [ ] **Step 2: Run** `npm test -w apps/api -- vercel-config`. Expected: FAIL (sem redirects).
- [ ] **Step 3: Implement** o redirecionamento em `vercel.ts` com `routes.redirect` (ou o objeto equivalente do `@vercel/config`), casando só o host exato `medicron.vercel.app` para não afetar os deploys de preview.
- [ ] **Step 4: Run** o mesmo teste. Expected: PASS.
- [ ] **Step 5: Commit** `feat: redireciona medicron.vercel.app para medicron.com.br`.
- [ ] **Step 6: Pedir OK ao usuário** para: adicionar `medicron.com.br` e `www.medicron.com.br` ao projeto (CLI `vercel domains add <domínio> medicron` ou `add_project_domain`), configurar `www` para redirecionar à raiz, definir `BETTER_AUTH_URL=https://medicron.com.br` em produção e fazer o deploy. Avisar de novo: todos entram de novo na web e reativam os avisos uma vez.
- [ ] **Step 7: Verificar** depois que o DNS propagar: `curl -sI https://medicron.vercel.app/` devolve 307 com `location: https://medicron.com.br/`; `curl -s -o /dev/null -w "%{http_code}" https://medicron.vercel.app/api/cron/dispatch` devolve 401 (sem redirecionar); `curl -sI https://www.medicron.com.br/` redireciona para a raiz; `https://medicron.com.br/entrar` devolve 200; o usuário confirma que consegue entrar. **Pedir ao usuário** que troque a URL do job no cron-job.org para `https://medicron.com.br/api/cron/dispatch` (mesmo `Authorization: Bearer <CRON_SECRET>`) e confira no histórico do job que voltou a responder 200; só depois a exceção de `/api/cron/` pode sair do redirecionamento.

### Task 4: Pacote `@medicron/shared`

**Files:**
- Create: `packages/shared/package.json`, `packages/shared/tsconfig.json`, `packages/shared/vitest.config.ts`, `packages/shared/src/index.ts`, `packages/shared/src/version.ts`, `packages/shared/src/api.ts`
- Test: `packages/shared/tests/version.test.ts`, `packages/shared/tests/api.test.ts`
- Modify: `apps/api/package.json` (dependência `"@medicron/shared": "*"`), `apps/api/next.config.ts` (`transpilePackages: ["@medicron/shared"]`)

**Interfaces:**
- Produces (de `@medicron/shared`):
  - `compareVersions(a: string, b: string): -1 | 0 | 1` (lança `Error` se algum não for `N`, `N.N` ou `N.N.N`)
  - `API_PREFIX = "/api/v1"`
  - tipos `ErrorDto`, `PatientDto`, `ItemDto`, `PlanDto`, `HomeDto`, `OnboardingDto`, `MeDto` (campos como no contrato; datas `string`)
  - schemas zod de corpo: `patientBody`, `itemBody`, `planCreateBody`, `planPatchBody`, `doseBody` (campos como no contrato; datas como `z.string().datetime()`)
  - `type PatientBody = z.infer<typeof patientBody>` e equivalentes
- O pacote exporta TypeScript direto (`"main": "src/index.ts"`, `"types": "src/index.ts"`), sem etapa de build.

- [ ] **Step 1: Write the failing tests.** `version.test.ts`: `compareVersions("1.2.3","1.2.3")` é `0`; `("1.2.3","1.10.0")` é `-1`; `("2.0.0","1.9.9")` é `1`; `("1.2","1.2.0")` é `0`; `("abc","1.0.0")` lança. `api.test.ts`: `patientBody.parse({name:"Izzy",species:"cat"})` passa; `patientBody.safeParse({name:"",species:"cat"}).success` é `false`; `patientBody.safeParse({name:"X",species:"dragon"}).success` é `false`; `doseBody.safeParse({planId:"p",scheduledFor:"2026-11-06T12:00:00.000Z",outcome:"done"}).success` é `true` e com `outcome:"later"` é `false`.
- [ ] **Step 2: Run** `npm test -w packages/shared`. Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** `version.ts`, `api.ts` e `index.ts`; criar os arquivos de configuração do pacote; adicionar a dependência e o `transpilePackages` no `apps/api`; rodar `npm install`.
- [ ] **Step 4: Run** `npm test -w packages/shared` e `npm run build`. Expected: PASS; build do Next sem erro.
- [ ] **Step 5: Commit** `feat: pacote shared com tipos, schemas de corpo e compareVersions`.

### Task 5: Base da API (contexto, erros, versão, `/me` e `/config`)

**Files:**
- Create: `apps/api/src/lib/api/context.ts`, `apps/api/src/lib/api/route.ts`, `apps/api/src/app/api/v1/me/route.ts`, `apps/api/src/app/api/v1/config/route.ts`, `apps/api/tests/api/harness.ts`
- Test: `apps/api/tests/api/foundation.test.ts`
- Modify: `apps/api/src/lib/session.ts` somente se for preciso extrair a parte comum, **sem mudar o comportamento de `getOrgContext`** (as telas continuam redirecionando).

**Interfaces:**
- Produces:
  - `class ApiError extends Error { constructor(public status: number, public code: string, message?: string) }`
  - `getApiContext(): Promise<OrgContext>` em `@/lib/api/context` (o tipo `OrgContext = { userId; orgId; role }` já existe em `@/lib/session`): lança `ApiError(401,"unauthorized")` sem sessão e `ApiError(403,"no_organization")` sem conta.
  - `route(handler: (req: Request, ctx: { params: Promise<Record<string,string>> }) => Promise<Response>)`: devolve o handler para exportar como `GET`/`POST`/etc.; antes de chamar, valida `x-app-version` contra `process.env.MIN_APP_VERSION` (padrão `"0.0.0"`); mapeia `ApiError`, `ZodError`, `NotFound`, `Forbidden`, `TooEarly`, `InvalidAppliedAt` e qualquer outro erro para JSON conforme o contrato. Exporta também `json(body, status?)` e `noContent()`.
  - Harness de teste (`tests/api/harness.ts`): `env = { db: Db, ctx: OrgContext }`, `freshDb(): Promise<Db>` (PGlite com migrações), `call(handler, path, init?: RequestInit & { json?: unknown, params?: Record<string,string> })`. Cada arquivo de teste de rota declara `vi.mock("@/lib/db", () => ({ getDb: () => env.db }))` e `vi.mock("@/lib/api/context", ...)` trocando `getApiContext` por `async () => env.ctx`.

- [ ] **Step 1: Write the failing tests** (`foundation.test.ts`), todas chamando os handlers diretamente:
  - sem sessão (mock de `getApiContext` lançando `ApiError(401,"unauthorized")`): `GET /me` devolve 401 `{ error: "unauthorized" }`.
  - `GET /me` com contexto devolve 200 com `orgId` e `role` do `env.ctx`.
  - `x-app-version: 0.9.0` com `MIN_APP_VERSION=1.0.0` devolve 426 `{ error: "app_outdated", minAppVersion: "1.0.0" }`; `1.0.0` e `1.10.2` passam; cabeçalho ausente passa; `abc` devolve 400 `invalid_app_version`.
  - `GET /config` devolve 200 `{ minAppVersion: "1.0.0" }` mesmo sem sessão e mesmo com versão antiga.
  - `route()` mapeia: `NotFound` → 404 `not_found`; `Forbidden` → 403 `forbidden`; `ZodError` → 400 `invalid_request` com `issues` não vazio; erro desconhecido → 500 `{ error: "internal" }` sem `stack` no corpo.
- [ ] **Step 2: Run** `npm test -w apps/api -- tests/api/foundation`. Expected: FAIL (módulos inexistentes).
- [ ] **Step 3: Implement** `context.ts`, `route.ts`, as duas rotas e o harness. O `getApiContext` reaproveita `pickActiveOrg` e `assertMember` como o `getOrgContext`, sem redirecionar.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): base da API v1 com contexto, erros em JSON e versão mínima`.

### Task 6: Endpoints de pacientes

**Files:**
- Create: `apps/api/src/lib/api/dto.ts` (`toPatientDto`), `apps/api/src/app/api/v1/patients/route.ts`, `apps/api/src/app/api/v1/patients/[id]/route.ts`
- Test: `apps/api/tests/api/patients.test.ts`

**Interfaces:**
- Consumes: `route`, `json`, `noContent`, `getApiContext` (Task 5); `patientBody`, `PatientDto` (Task 4); `createPatient`, `listPatients`, `getPatient`, `updatePatient`, `archivePatient` (serviços).
- Produces: `toPatientDto(p: Patient): PatientDto`.

- [ ] **Step 1: Write the failing tests** (harness da Task 5):
  - `POST /patients {name:"Izzy",species:"cat",weightKg:4.2}` → 201 com `patient.name === "Izzy"` e `patient.species === "cat"`; depois `GET /patients` lista um item.
  - `POST` com `{name:"",species:"cat"}` → 400 `invalid_request`; com corpo que não é JSON → 400 (não 500).
  - `GET /patients/:id` de paciente da **organização `o2`** (ctx em `o1`) → 404 `not_found`.
  - `PATCH /patients/:id {name:"Nina",species:"dog"}` → 200 com os novos valores; de outra organização → 404.
  - `DELETE /patients/:id` → 204; segunda chamada → 204; `GET /patients` não lista mais.
- [ ] **Step 2: Run** `npm test -w apps/api -- tests/api/patients`. Expected: FAIL.
- [ ] **Step 3: Implement** os handlers: validar o corpo com `patientBody`, converter para o `PatientInput` dos serviços (`weightKg` número) e responder com `toPatientDto`.
- [ ] **Step 4: Run** os testes. Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): endpoints de pacientes`.

### Task 7: Endpoints de itens

**Files:**
- Modify: `apps/api/src/lib/api/dto.ts` (`toItemDto`)
- Create: `apps/api/src/app/api/v1/items/route.ts`, `apps/api/src/app/api/v1/items/[id]/route.ts`
- Test: `apps/api/tests/api/items.test.ts`

**Interfaces:**
- Consumes: Task 5 e Task 4 (`itemBody`, `ItemDto`); `createItem`, `listItems`, `getItem`, `updateItem`, `archiveItem`.
- Produces: `toItemDto(i: Item): ItemDto`.

- [ ] **Step 1: Write the failing tests:** `POST /items {name:"Agemoxi",kind:"medication"}` → 201; `GET /items?kind=procedure` não inclui a medicação e `?kind=medication` inclui; `kind` inválido na consulta → 400; `POST` sem `name` → 400; `GET /items/:id` de outra organização → 404; `PATCH` troca `defaultDose`; `DELETE` → 204 (duas vezes) e some da lista.
- [ ] **Step 2: Run** `npm test -w apps/api -- tests/api/items`. Expected: FAIL.
- [ ] **Step 3: Implement** os handlers.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): endpoints de itens`.

### Task 8: Endpoints de rotinas

**Files:**
- Modify: `apps/api/src/lib/api/dto.ts` (`toPlanDto`)
- Create: `apps/api/src/app/api/v1/patients/[id]/plans/route.ts`, `apps/api/src/app/api/v1/plans/[id]/route.ts`
- Test: `apps/api/tests/api/plans.test.ts`

**Interfaces:**
- Consumes: Task 5, Task 4 (`planCreateBody`, `planPatchBody`, `PlanDto`), Task 7 (`toItemDto`); `createPlan`, `listPlansForPatient`, `updatePlan`, `deactivatePlan`.
- Produces: `toPlanDto(p: PlanWithItem | CarePlan): PlanDto` (`item` só quando vier junto).

- [ ] **Step 1: Write the failing tests:**
  - `POST /patients/:id/plans {itemId, intervalMinutes: 480, anchorAt: "2026-11-06T12:00:00.000Z", reschedule: true}` → 201 com `plan.reschedule === true` e `plan.intervalMinutes === 480`; depois `GET /patients/:id/plans` devolve a rotina com `item.name`.
  - Paciente ou item de outra organização → 404.
  - `intervalMinutes: 1` → 400 (mínimo de 5 minutos, vindo do serviço).
  - `PATCH /plans/:id {reschedule:false, dose:"2 gotas"}` → 200 com os valores; `{endAt:"2000-01-01T00:00:00.000Z"}` (antes da próxima dose) → 422 `end_before_next_dose`.
  - `DELETE /plans/:id` → 204 (duas vezes) e a rotina some da listagem.
- [ ] **Step 2: Run** `npm test -w apps/api -- tests/api/plans`. Expected: FAIL.
- [ ] **Step 3: Implement** os handlers; converter strings ISO para `Date`; mapear a mensagem "A data final…" do `updatePlan` para 422 `end_before_next_dose`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): endpoints de rotinas`.

### Task 9: Endpoints de home, doses e onboarding

**Files:**
- Create: `apps/api/src/app/api/v1/home/route.ts`, `apps/api/src/app/api/v1/doses/route.ts`, `apps/api/src/app/api/v1/onboarding/welcome/route.ts`, `apps/api/src/app/api/v1/onboarding/checklist/dismiss/route.ts`
- Test: `apps/api/tests/api/home-doses.test.ts`

**Interfaces:**
- Consumes: Task 5, Task 4 (`doseBody`, `HomeDto`, `OnboardingDto`); `getHome`, `serializeHome` (de `@/components/home/serialize`), `listPatients`, `getOnboarding`, `resolveSlot`, `markWelcomeSeen`, `dismissChecklist`.
- Produces: `GET /home` devolvendo `{ home, hasPatients, onboarding }`.

- [ ] **Step 1: Write the failing tests:**
  - `GET /home` numa conta vazia → 200 com `hasPatients: false`, `onboarding.showWelcome: true` e `home.patients` vazio; com um paciente e uma rotina criados, `hasPatients: true`. `?dia=2026-13-45` (inválido) é ignorado e devolve o dia de hoje (como o serviço já faz).
  - `POST /doses` com `outcome:"done"` num horário vencido → 200 `{ recorded: true }`; a **mesma** chamada de novo → 200 `{ recorded: false, reason: "already" }`.
  - `POST /doses` de horário a mais de 15 minutos no futuro → 409 `too_early`.
  - Rotina com `reschedule` e `appliedAt` no futuro → 422 `invalid_applied_at`.
  - Dose de rotina de outra organização → 404.
  - `POST /onboarding/welcome` → 204 e `GET /home` passa a trazer `onboarding.showWelcome: false`; `POST /onboarding/checklist/dismiss` → 204 e `onboarding.checklist.show: false`.
- [ ] **Step 2: Run** `npm test -w apps/api -- tests/api/home-doses`. Expected: FAIL.
- [ ] **Step 3: Implement** os handlers (o horário "agora" vem de `new Date()`; `appliedAt` e `scheduledFor` viram `Date`).
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(api): home, doses e onboarding`.

### Task 10: `better-auth` com o plugin do Expo e origens do app

**Files:**
- Modify: `apps/api/src/lib/auth.ts` (extrair `createAuth(db, opts)` e manter `export const auth = createAuth(getDb())`), `apps/api/package.json` (dependência `@better-auth/expo` na mesma versão do `better-auth`)
- Test: `apps/api/tests/auth-expo.test.ts`

**Interfaces:**
- Produces: `createAuth(db: Db, opts?: { baseURL?: string; secret?: string; withNextCookies?: boolean; extraTrustedOrigins?: string[] })` com `emailAndPassword` e `organization` iguais aos de hoje, mais `expo()`, mais `trustedOrigins` contendo `medicron://`, `medicron://*`, `https://medicron.com.br`, `https://www.medicron.com.br` e os itens de `EXTRA_TRUSTED_ORIGINS` (lista separada por vírgula, para `exp://` em desenvolvimento e previews). `withNextCookies` padrão `true`; os testes passam `false`, porque `nextCookies()` exige contexto de requisição do Next.

- [ ] **Step 1: Write the failing test** (PGlite com migrações, `createAuth(db, { secret: "x".repeat(32), baseURL: "http://localhost:3000", withNextCookies: false })`): `auth.options.plugins` inclui um plugin com `id === "expo"`; `trustedOrigins` contém `medicron://` e `https://medicron.com.br`; um `auth.handler` de `POST /api/auth/sign-up/email` com cabeçalho `origin: medicron://` devolve 200 e define cookie de sessão.
- [ ] **Step 2: Run** `npm test -w apps/api -- auth-expo`. Expected: FAIL (`createAuth` inexistente).
- [ ] **Step 3: Implement** a extração e o plugin; instalar `@better-auth/expo` (mesma versão do `better-auth`, atualmente 1.7.17).
- [ ] **Step 4: Run** o teste e a suíte inteira. Expected: PASS; os 258 testes anteriores seguem passando.
- [ ] **Step 5: Commit** `feat(auth): plugin do Expo e origens confiáveis do app nativo`.

### Task 11: Verificação final e publicação (pede OK ao usuário)

**Files:** nenhum.

**Interfaces:** consome todas as tarefas anteriores.

- [ ] **Step 1: Verificar tudo** na raiz: `npm test` (os 258 originais mais os novos, todos passando), `npm run lint`, `npm run build`, `npx tsc --noEmit -p apps/api`.
- [ ] **Step 2: Pedir OK ao usuário** para publicar em produção (`vercel --prod --yes` da raiz). Avisar que não há migração de banco neste plano.
- [ ] **Step 3: Teste de fumaça em produção** (sem credenciais): `GET https://medicron.com.br/api/v1/config` devolve 200 com `minAppVersion`; `GET https://medicron.com.br/api/v1/me` devolve 401 JSON `{"error":"unauthorized"}`; `GET /api/v1/me` com `x-app-version: abc` devolve 400; as telas (`/entrar`) seguem respondendo 200.
- [ ] **Step 4: Atualizar o documento de design** (`docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md`) marcando as Etapas 0 e 1 como concluídas, e commitar.
