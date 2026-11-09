# Medicron como app nativo (Expo): design da migração

Data: 2026-11-06. Estado: rascunho para revisão. Português do Brasil em toda a interface.

## Intenção

Hoje o Medicron é um app web (Next.js) que só recebe lembretes se a pessoa "adicionar à tela de início" pelo navegador, o que não é trivial para todo mundo. O objetivo é **estar nas lojas (Android e iOS) com push nativo**, mantendo **um único front-end** para web, iOS e Android, e **o mesmo visual e a mesma usabilidade de hoje**. O backend continua único e passa a servir web e celular.

## Objetivos

- Um app instalável pela App Store e pelo Google Play, com push nativo de lembrete de dose.
- **Um só código de interface** (Expo + React Native, com web via react-native-web). Nada de duas interfaces em paralelo.
- Paridade com o app de hoje: todas as 13 telas, os fluxos e o comportamento (reprogramação de horários, sequência, tour de boas-vindas, convites, tema claro/escuro).
- Fidelidade visual: mesmas cores, espaçamentos, tipografia, ícones e componentes.
- Backend único: o Next.js vira só a API (login, regras, banco, cron, push).
- Contas, dados e convites existentes seguem valendo, sem migração de dados (exceto a tabela de dispositivos de push).

## Não objetivos

- Novas funcionalidades, redesenho, modo offline, tablet, relógio, login social, outros idiomas.
- Reescrever as regras de negócio: `src/lib/services/*` e seus testes ficam como estão.

## Anti-objetivos (seria fracasso mesmo que "funcione")

- Duas bases de interface para manter (uma web, outra nativa).
- Telas que parecem de outro app, ou usabilidade pior que a de hoje (alvos de toque menores que 44 px, contraste abaixo de AA, fluxos mais longos).
- Perder o lembrete de quem usa só a web hoje.

## Decisões já tomadas (por você, na conversa)

- Caminho **B**: Expo universal para web, iOS e Android; o Next.js deixa de renderizar telas e vira API na Vercel.
- A web passa a ser um **site estático** gerado pelo Expo (sem SSR, o app fica atrás de login), hospedado na Vercel.
- Manter fielmente visual e usabilidade; usar uma biblioteca de componentes compatível com o que existe hoje (shadcn + Tailwind).

## Escolhas minhas (revise)

1. **Estilos e componentes:** NativeWind v5 (Tailwind v4) com componentes no estilo do shadcn (React Native Reusables como base, copiados para dentro do projeto), `lucide-react-native` para ícones, `@gorhom/bottom-sheet` para os sheets, `react-native-svg` e `expo-linear-gradient` onde preciso. Versões do teste, fixadas exatas: `expo ~58`, `react-native 0.88`, `nativewind 5.0.0-rc.1`, `react-native-css 3.1.0-rc.1`, `tailwindcss 4.1.12`. **Risco:** o NativeWind v5 é release candidate e os mantenedores não o recomendam para produção. Plano B documentado: NativeWind v4 estável (Tailwind v3) convertendo os tokens de `oklch` para hex, ou Uniwind.
2. **Monorepo** com `apps/api` (o Next.js atual, sem telas), `apps/app` (Expo) e `packages/shared` (schemas zod, tipos e cliente da API).
3. **API:** Route Handlers REST com validação zod, no lugar das 12 Server Actions e das leituras feitas hoje pelas páginas. Tipos compartilhados em `packages/shared`. No cliente, TanStack Query para leituras e mutações.
4. **Login:** `better-auth` com o plugin `@better-auth/expo`. No celular a sessão fica no armazenamento seguro e vai no cabeçalho `Cookie` (validado no teste). Para a web não ter CORS nem cookie de terceiros, o app web e a API ficam no **mesmo domínio**: o projeto estático da Vercel reescreve `/api/*` para o projeto da API.
5. **Push:** nativo pelo **Expo Push Service** (`expo-server-sdk`), que cobre APNs e FCM. Nova tabela `push_devices` (usuário, token do Expo, plataforma). O envio usa a peça que já existe (`PushSender` em `dispatch.ts`), com um segundo sender. **A web mantém o Web Push atual** (service worker) para não perder quem só usa o navegador; `dispatchDue` envia pelos dois.
6. **Fontes:** carregar a Geist via `expo-font`, para o texto nativo não cair na fonte do sistema.
7. **Testes:** os testes de serviços (PGlite) ficam intactos; testes de rota da API são novos; os testes de UI são reescritos com `jest-expo` + `@testing-library/react-native` (os atuais usam jsdom e não rodam em React Native).
8. **Migração gradual, sem janela fora do ar:** o Next atual continua em produção até a versão Expo ter paridade; só então o domínio troca para o site estático.
9. **Sessões da web na virada:** continuam válidas se o `BETTER_AUTH_SECRET`, as opções de cookie e o host não mudarem. A API mantém o mesmo projeto, o mesmo segredo e o mesmo host (o site estático só reescreve `/api/*` para ela), então o cookie que o Next emite hoje é o mesmo que o `better-auth` lê depois. A Etapa 6 só vai ao ar depois de um ensaio em preview com uma sessão criada antes da troca.
10. **NativeWind v5 RC:** começar por ele, com versões fixadas exatas e a primeira tarefa da Etapa 2 sendo reproduzir o teste (tokens, claro/escuro, degradê, opacidade) dentro do monorepo. Sai para o plano B (NativeWind v4 com cores em hex) se, durante a Etapa 3, qualquer tela exigir contorno que o v5 não consiga resolver, ou se a versão estável sair antes do envio às lojas, o que for primeiro. Publicar com uma RC é aceitável porque ela é só o compilador de estilos em tempo de build, e a paridade é validada tela a tela.
11. **URLs da API por ambiente:** produção usa o mesmo domínio do site (`/api`); o app nativo recebe a URL absoluta por variável (`EXPO_PUBLIC_API_URL`) definida em cada perfil do EAS (desenvolvimento, preview e produção). As origens confiáveis do `better-auth` incluem o esquema do app e os domínios de cada ambiente.
12. **"Mesmo visual" quer dizer equivalente, não idêntico, só onde o controle nativo substitui o do navegador:** seletores de data, hora e opções, fonte do sistema onde a Geist não carregar, e ausência de hover. Todo o resto (cores, espaçamento, ícones, textos, fluxo, tamanho dos alvos) deve ficar igual. Você aprova cada tela vendo capturas lado a lado, em claro e escuro, antes de seguir para a próxima.
13. **Web Push e "PWA antigo":** a Etapa 6 remove só o que é do Next (rotas, componentes e a configuração do PWA gerada por ele). O `manifest.webmanifest`, os ícones e o `sw.js` passam para a pasta `public/` do projeto Expo e continuam servidos, porque o Web Push (inclusive no iPhone, que exige o app adicionado à tela de início) depende deles. O componente de avisos ganha uma variante web (`.web.tsx`) com a lógica atual e uma nativa com o Expo.
14. **Atualização e compatibilidade:** os endpoints ficam sob `/api/v1` e mudam apenas de forma aditiva. O app envia a versão no cabeçalho `x-app-version`, e a API tem uma versão mínima aceita (o app mostra uma tela de "atualize o app" abaixo dela). Mudanças só de JavaScript chegam por atualização remota (`expo-updates` com EAS Update); mudanças nativas exigem novo envio às lojas.
15. **Links de convite:** viram links universais (iOS) e App Links (Android) sobre o domínio de produção: abrem o app se estiver instalado e caem na página web de convite se não estiver. Exige hospedar `apple-app-site-association` e `assetlinks.json` nesse domínio, na Etapa 5.

## Evidências do teste descartável (`~/Projects/medicron-spike`, fora do repositório)

- Visual: login e tela Hoje (barra superior, primeiros passos, sequência com anel, cartões de dose, linha do dia, barra inferior, sheet de boas-vindas) ficaram praticamente idênticos ao app web, no iPhone simulado e na web, nos temas claro e escuro. Os tokens vieram do `globals.css` real.
- Login: criar conta, criar/listar/ativar organização, convidar, segunda pessoa aceitar, API lendo a sessão pelo `Cookie`, sair/entrar e persistência após fechar o app: tudo passou.
- Push: permissão do iOS, token nativo do APNs (até no simulador), notificação local e notificação injetada chegaram. **Não provado:** entrega real de um servidor a um aparelho, app fechado, toque na notificação, Android.
- Atritos conhecidos, a tratar no projeto: (a) o modificador de opacidade (`/20`) não resolve cores de variável `oklch` no nativo, então precisa de tokens de alfa explícitos; (b) ícones não herdam `className`, as cores vêm de um mapa em TypeScript; (c) `grid` do CSS vira flex; (d) campos de data e hora e `<select>` viram seletores nativos (`@react-native-community/datetimepicker` e sheet/picker); (e) a API do `tabBar` mudou e `getCookie()` é assíncrono (a documentação está atrasada); (f) Expo Go não serve para push real, é preciso build de desenvolvimento no EAS.

## Inventário do que migra

- 13 telas: Hoje, Pacientes (lista, novo, detalhe com abas Dados e Rotina, nova rotina), Itens (lista, novo, detalhe), Conta, Entrar, Cadastrar, Nova conta, Convite.
- 12 Server Actions → endpoints: criar/editar/arquivar paciente e item; criar/editar/encerrar rotina; registrar dose; concluir boas-vindas; dispensar checklist.
- Leituras hoje feitas dentro das páginas (`getHome`, listas, detalhes, onboarding) → endpoints de leitura.
- 3 Route Handlers que permanecem: `/api/auth/*`, `/api/push/subscribe` (web), `/api/cron/dispatch`.
- ~30 componentes de domínio e 20 de UI reescritos em React Native com as mesmas classes sempre que possível.
- Serviços (8) e regras de negócio (horários, reprogramação, sequência, tour, convites): **não mudam**.

## Etapas

0. **(Concluída em 2026-11-07)** **Reestruturar em monorepo** sem mudar comportamento (mover o Next para `apps/api`, criar `packages/shared`) e **ligar `medicron.com.br` ao projeto atual**, com o redirecionamento do domínio antigo. Fora isso, produção intacta.
1. **(Concluída em 2026-11-07)** **Camada de API:** endpoints REST + zod + testes, plugin do Expo e origens confiáveis no `better-auth`, reescrita `/api/*` no mesmo domínio. O Next atual passa a usar os mesmos serviços sem mudar de aparência.
2. **(Concluída em 2026-11-07, falta a aprovação visual completa do usuário)** **Base do app Expo:** tokens, tema claro/escuro, fontes, kit de UI (os 20 componentes), navegação (abas, cabeçalho, pilhas), cliente da API, telas de login.
3. **Paridade por tela** (planos 3A a 3D), na ordem: **(3A, concluída em 2026-11-08)** Hoje (e o tour), **(3B, concluída em 2026-11-08)** Pacientes e Rotinas, **(3C, concluída em 2026-11-08)** Itens, **(3D, concluída em 2026-11-08; Etapa 3 completa, aprovação visual final no teste de ponta a ponta)** Conta e convites. Tema manual (Claro/Escuro/Sistema): só no app nativo; na web o escuro segue o navegador até a Etapa 6. Cada tela é aceita com comparação lado a lado com o app de hoje, em claro e escuro.
4. **Push:** tabela `push_devices`, registro do token no app, sender do Expo, links ao tocar na notificação (rota de destino no payload), manter o Web Push.
5. **Lojas:** projeto Firebase e chaves de push (FCM e APNs), registro do `app.medicron` nas duas lojas, ícones e tela de abertura, política de privacidade em `medicron.com.br`, builds no EAS, teste interno (TestFlight e faixa interna do Google Play), teste fechado de 12 testadores por 14 dias se a conta do Google exigir, e revisão das lojas.
6. **Virada da web:** ensaiar em preview com uma sessão criada antes (escolha 9), publicar o site estático do Expo no domínio atual, desligar as telas do Next e a configuração de PWA que o Next gera, mantendo manifest, ícones e `sw.js` (escolha 13).

## Critérios de pronto

- Todas as telas do inventário existem nas três plataformas, com os mesmos fluxos.
- Cada tela passa na comparação visual lado a lado (claro e escuro) e mantém alvos de toque de 44 px e contraste AA (o teste `theme-contrast` continua valendo).
- Lembrete chega em aparelho físico iOS e Android, com o app aberto, em segundo plano e fechado, e tocar abre a tela certa.
- Login, convite (inclusive abrir o app pelo link), troca de conta e logout funcionam nas três plataformas; uma sessão da web criada antes da virada continua válida depois dela.
- Suíte de serviços verde, testes de rota e de UI novos verdes, `tsc` e lint limpos.
- Apps aprovados nas duas lojas.

## Contas, identificadores e domínio (respostas suas)

- **Contas:** Apple Developer e Google Play já existem, ambas em nome de **pessoa física**. O nome do titular aparece como "vendedor" nas duas lojas.
- **Identificador:** `app.medicron`, usado como `bundleIdentifier` (iOS) e `package` (Android). O nome do app nas lojas é "Medicron".
- **Domínio de produção:** `medicron.com.br` (a registrar e apontar para a Vercel). `medicron.vercel.app` passa a servir só desenvolvimento e preview.
- **Firebase:** não é para login (o login é do `better-auth`). Serve só para o **push no Android**: o FCM exige um projeto Firebase, um `google-services.json` no app e uma chave de serviço enviada ao EAS. O iOS usa a chave APNs da conta Apple. Nenhum SDK do Firebase entra no código do app além dessa configuração.
- **Google Play, conta pessoal:** se a conta foi criada **depois de 13/11/2023**, o Google exige um teste fechado com pelo menos **12 testadores inscritos por 14 dias seguidos** antes de liberar a produção ([regra do Google](https://support.google.com/googleplay/android-developer/answer/14151465)). Contas anteriores a essa data não têm a exigência. **Precisa conferir a data de criação da conta**; se valer, a Etapa 5 ganha no mínimo duas semanas, e o recrutamento dos testadores começa cedo.
- **Política de privacidade:** obrigatória nas duas lojas (dados de saúde, LGPD), publicada em `medicron.com.br`.

### O que o domínio novo muda (escolha minha: revise)

Trocar de `medicron.vercel.app` para `medicron.com.br` muda o host. Isso desloga quem usa a web hoje (o cookie é do host antigo), invalida as inscrições de Web Push (são por origem) e deixa órfão o PWA já instalado. Por isso:

- **Quando:** anexar o domínio ao projeto atual já na **Etapa 0**, e não na virada. Assim a troca de host acontece uma vez só, cedo, com poucos usuários, e as lojas, o Firebase e os links universais já nascem com o endereço final.
- **Redirecionamento:** `medicron.vercel.app` redireciona para `medicron.com.br`.
- **Efeito aceito:** cada pessoa precisa entrar de novo e reativar os avisos na web uma vez. Quem instalar o app da loja não passa por isso.
- **Links universais e App Links:** `apple-app-site-association` e `assetlinks.json` servidos em `medicron.com.br/.well-known/`.
- A escolha 9 (sessões na virada) passa a valer entre o host novo e o app estático: o segredo, as opções de cookie e o host de `medicron.com.br` não mudam na Etapa 6.

## Fora do que decidi (o construtor resolve)

Estrutura exata de pastas, nomes dos endpoints, biblioteca de formulários, estratégia de cache do TanStack Query, organização dos tokens de alfa, detalhes de acessibilidade em cada componente.

## Riscos principais

1. NativeWind v5 em RC (mitigação: versões fixadas e plano B).
2. Entrega real de push nunca foi testada (precisa de aparelho físico, Apple Developer e Firebase).
3. Aprovação da Apple: o app é nativo de verdade, o que reduz o risco da regra 4.2, mas dados de saúde pedem política de privacidade clara.
3b. Google Play em conta pessoal pode exigir o teste fechado de 12 testadores por 14 dias, o que adiciona pelo menos duas semanas ao envio (depende da data de criação da conta).
4. Volume de trabalho: cerca de 50 componentes e 13 telas reescritos, mais a camada de API.
5. Versões muito novas do Expo/React Native: a documentação já errou duas vezes no teste.
