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

Prontos: login, casca de navegação, a tela **Hoje** (sequência, atenção, linha do dia, registrar dose, primeiros passos e boas-vindas) **Pacientes e Rotinas** (lista, novo, detalhe com Dados e Rotina, editar, arquivar, nova rotina) e **Itens** (medicações e procedimentos: lista, novo, editar, arquivar). **Conta** (pessoas, convites, aparência) e a tela de **convite**. O push (notificações) entra no Plano 4. O aviso de notificações da Hoje e o push nativo entram no Plano 4.

## Documentos

Design: `docs/superpowers/specs/2026-11-06-app-nativo-expo-design.md`. Planos: `docs/superpowers/plans/`.
