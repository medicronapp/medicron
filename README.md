# Medicron

Lembretes de medicação e cuidados de quem você cuida. Monorepo com:

- `apps/api`: Next.js, só como API (`/api/v1`, `better-auth`) e o site atual, na Vercel (diretório raiz do projeto).
- `apps/app`: app Expo (web, iOS e Android), em construção, que vai substituir o front-end do Next.
- `packages/shared`: schemas zod, tipos da API, `compareVersions`, `safeNext` e `orgSlug`, usados pelos dois.

## Rodando

```bash
npm install            # na raiz
npm run dev            # API/site (apps/api)
npm test               # testes de API, shared e app
npm run lint
npm run typecheck
```

### App Expo

```bash
cd apps/app
cp .env.example .env   # EXPO_PUBLIC_API_URL (padrão: https://medicron.com.br)
npm run start          # depois i (iOS), a (Android) ou w (web)
npm run sync-tokens    # regenera as cores a partir de apps/api/src/app/globals.css
npm run build-assets   # regenera ícones e tela de abertura
```

- No **Expo Go**, o login só funciona se a API confiar na origem `exp://`: a produção usa `EXTRA_TRUSTED_ORIGINS=exp://**`. **Remover antes de publicar nas lojas** (os builds usam `medicron://`).
- Na **web em desenvolvimento** o login contra `medicron.com.br` é bloqueado por CORS (esperado; em produção o app fica na mesma origem da API). Teste no iOS ou Android.
- As versões do NativeWind, `react-native-css` e `lightningcss` são fixadas de propósito (override na raiz). Se o bundle falhar com "failed to deserialize", confira `npm ls lightningcss`.

### Estado do app

Prontos: login, casca de navegação, a tela **Hoje** (sequência, atenção, linha do dia, registrar dose, primeiros passos e boas-vindas) **Pacientes e Rotinas** (lista, novo, detalhe com Dados e Rotina, editar, arquivar, nova rotina) e **Itens** (medicações e procedimentos: lista, novo, editar, arquivar). **Conta** (pessoas, convites, aparência) e a tela de **convite**. O **push nativo** está implementado, mas só funciona depois de aplicar a migração `0008` e configurar o EAS e as chaves de push: veja `docs/push-setup.md`. A **preparação para as lojas** (exclusão de conta pelo app, política de privacidade em `/privacidade`, arquivos de links universais, `app.json`/`eas.json`, fichas em `docs/lojas.md`) está pronta; o envio depende de contas e passos seus, em `docs/passos-do-usuario.md`. A **web agora é o app Expo** (site estático no projeto `medicron-web`, com Web Push); o Next virou só API. A troca do domínio é um passo seu, em `docs/virada-da-web.md`.

## Documentos

Design: `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md`. Planos: `docs/superpowers/plans/`.
