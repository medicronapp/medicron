# Imagens da loja (App Store e Google Play)

Como as imagens de divulgação do Medicron são geradas, os padrões visuais adotados e o que fazer para **alterar uma tela, criar uma nova ou gerar o conjunto do Android** (que ainda não foi feito). Complementa `docs/lojas.md` (fichas e requisitos das lojas).

> Estado em 2026-11-10: **iPhone pronto** (7 imagens em 2 tamanhos) e **Android pronto** (5 imagens de telefone 1080×1920 e o gráfico de destaque 1024×500). Os tablets (iPad / Android) não são usados (`supportsTablet: false`).

## O que existe hoje

Saída em `store-assets/ios/<tamanho>/NN-id.png`, PNG sem transparência:

| Pasta | Tamanho | Uso na App Store Connect |
|---|---|---|
| `store-assets/ios/6.9/` | 1320×2868 | iPhone 6,9" |
| `store-assets/ios/6.5/` | 1284×2778 | iPhone 6,5" |
| `store-assets/android/1080x1920/` | 1080×1920 | Google Play, capturas de telefone (só os slides 01 a 05) |
| `store-assets/android/feature-graphic-1024x500.png` | 1024×500 | Google Play, gráfico de destaque |

Sete slides, na ordem de exibição:

| # | id | Conteúdo | Tema | Origem da tela |
|---|---|---|---|---|
| 01 | `hoje` | Tela Hoje | claro | captura real do app |
| 02 | `pacientes` | Lista de pacientes | escuro | captura real |
| 03 | `rotina` | Rotina da Ana | claro | captura real |
| 04 | `itens` | Medicações | escuro | captura real |
| 05 | `conta` | Pessoas e convite | claro | captura real |
| 06 | `bloqueio` | Widgets na tela de bloqueio (com foto) | escuro | **reproduzida em HTML** |
| 07 | `widget` | Widget médio na tela inicial | claro | **reproduzida em HTML** |

Os temas **alternam** (claro, escuro, claro...). Para refazer tudo:

```bash
cd apps/app
npx expo export -p web && node scripts/finalize-web.cli.ts   # só se o app mudou (gera dist/)
npm run capture-store-shots                                   # grava store-assets/ios/* e store-assets/android/*
```

Precisa do Google Chrome em `/Applications/Google Chrome.app` (ou `CHROME_BIN`) e do `sharp` (já é devDependency). Leva ~1 minuto.

## Como funciona (arquitetura)

```
demo-data.ts ──► demo-server.ts ──► (Chrome) captura da tela real ─┐
                                                                    ├─► store-slides.ts (HTML do slide) ─► (Chrome) PNG ─► sharp ─► store-assets/
store-widgets.ts (widgets em HTML, com as props reais) ────────────┘
```

| Arquivo (em `apps/app/scripts/`) | Papel |
|---|---|
| `demo-data.ts` | Dados fictícios (Família Souza: Ana, Pedro, Mel, Carla, Luna), relógio congelado (terça 10/11/2026, 12:05), `WIDGET_DEMO_NOW` (11:40) e `DEMO_WIDGET_PROPS`. **Só `import type` de `@medicron/shared`** (o Node não importa o fonte do shared em tempo de execução). |
| `demo-server.ts` | Servidor local que serve o app web real (`dist/`) com a API simulada (`demoApi`) e o relógio congelado; `shoot()` fotografa uma rota no tema pedido. Compartilhado com `capture-site-shots` (imagens do hotsite). |
| `store-slides.ts` | **Roteiro** (`STORE_SLIDES`), **tamanhos por plataforma** (`STORE_SIZES`, cada um com `platform`), `slidesFor(size)` (iPhone: 7 slides; Android: só os 5 de app) e `renderStoreSlide()`, que monta o HTML de um slide. É aqui que se muda texto, ordem, tema e layout. |
| `store-feature.ts` | Gráfico de destaque da Google Play (1024×500): marca, a frase do site em 2 linhas com destaque e o celular com a tela Hoje. |
| `store-widgets.ts` | Reprodução dos widgets do iOS (tela de bloqueio e tela inicial) a partir de `src/widgets/*`. |
| `capture-store-shots.cli.ts` | Orquestra: captura as telas reais, monta cada slide em cada tamanho (`store-assets/<plataforma>/<tamanho>/`), fotografa no Chrome e grava o PNG (achata a transparência com `sharp`); também gera o gráfico de destaque. |

Testes: `tests/store-slides.test.ts`, `tests/store-widgets.test.ts`, `tests/store-feature.test.ts`, `tests/site-shots.test.ts` (dados e API simulada).

## Padrões visuais (o "design system" das imagens)

Seguem o hotsite (`docs/superpowers/specs/2026-11-10-hotsite-design.md`) para a loja e o site parecerem a mesma marca.

- **Cartão arredondado** (como o hero do site): a imagem tem a cor de fundo do site (`#fbfaf7` no claro, `#0b1314` no escuro) e, dentro, um cartão com margem de 64 px e cantos de 110 px (medidas para 1320 px de largura; todas escalam com a largura). O cartão **recorta o celular na base**.
- **Degradês do tema**:
  - claro: `linear-gradient(170deg, oklch(0.955 0.03 195), oklch(0.975 0.01 95) 48%, oklch(0.95 0.03 235))` (o do hero do site);
  - escuro: verde-petróleo para azul-noite (`oklch(0.3 0.07 205)` para `oklch(0.2 0.055 235)`), com brilhos suaves nos cantos.
- **Tipografia**: Geist (a do site), título peso 600, 128 px, entrelinha 1,1, `letter-spacing: -.028em`; subtítulo peso 400, 54 px, entrelinha 1,45, cinza do site no claro (`oklch(0.5 0.015 200)`) e branco a 70% no escuro. As fontes vão embutidas em base64 (`@fontsource/geist`).
- **Título sempre em 2 linhas**: a quebra é **explícita** (`lines: [linha1, linha2]`, até 18 letras cada). As linhas não quebram (`white-space: nowrap`) e um script no HTML reduz a fonte de 2 em 2 px até a mais larga caber (aguarda `document.fonts.ready`). Se um título novo não couber nem a 60 px, encurte a linha.
- **Palavra-chave em destaque** (`highlight`): um trecho de uma das linhas, em `<em>`, na cor da marca (`#0f766e` no claro, `#7ee7d3` no escuro).
- **Celular**: moldura de 26 px (escura no claro, `#2b3436` no escuro, para não sumir no fundo), cantos de 150 px, ilha de câmera, faixa de status de 78 px com a cor de fundo do app; sai pela base.
- **Alternância de tema**: claro e escuro se revezam entre os slides, começando pelo claro.
- **Texto da loja**: curto, em português, **sem promessa médica nem superlativo**. Um teste barra `cura`, `trata`, `tratamento`, `diagnóstico`, `dose certa`, `melhor`, `nº 1`, `garant…`, `sempre`, `nunca`. Título ≤ 42 caracteres, subtítulo ≤ 70.

## Como alterar o que já existe

- **Trocar texto, destaque ou tema de um slide**: edite a linha do slide em `STORE_SLIDES` (`store-slides.ts`) e rode `npm run capture-store-shots`. Os testes cobrem as regras (2 linhas, destaque presente, textos proibidos).
- **Mudar a ordem**: reordene o array (o prefixo `NN-` do arquivo vem da posição). Mantenha a alternância de tema.
- **Mudar dados da demonstração** (nomes, doses, rotina): `demo-data.ts` (`demoPatients`, `demoItems`, `demoPlans`, `demoHome`). Os testes de `tests/site-shots.test.ts` garantem a coerência entre as telas (por exemplo, as medicações do Hoje existem em Itens e a rotina da Ana tem os mesmos itens).
- **Mudar cores, margens, tamanhos**: o CSS está dentro de `renderStoreSlide` (medidas em `px(n)`, proporcionais à largura). Há testes de regressão para o fundo escuro, a tipografia, o cartão e o espaço entre o texto e o celular.
- **Atualizar depois de mudar o app**: reexporte a web (`expo export` + `finalize-web`) e rode a captura; as telas reais são refotografadas.

## Como criar uma tela nova (slide de captura real)

1. Garanta que a tela abre numa **rota** do app e que a API que ela chama está em `demoApi` (`demo-server.ts`). Se faltar, o script avisa "Requisições sem resposta simulada".
2. Se faltarem dados, acrescente em `demo-data.ts` (com `import type`, sem importar valores do shared) e teste em `tests/site-shots.test.ts`.
3. Adicione uma linha em `STORE_SLIDES` com `kind: "app"`, `route`, `lines` (2 linhas), `highlight`, `subtitle` e o `theme` que mantém a alternância.
4. Rode os testes e `npm run capture-store-shots`; confira o PNG novo nos dois tamanhos.

## Widgets (slides 06 e 07): por que são reproduzidos

Os widgets são nativos do iOS (SwiftUI via `expo-widgets`) e **não existem no app web**, então não dá para fotografá-los como as outras telas. `store-widgets.ts` os redesenha em HTML seguindo `src/widgets/*`: mesmos textos, estilos de texto, cores e disposição, com a fonte do sistema da Apple (o Chrome do macOS tem SF) e SF Symbols aproximados em SVG.

- **Dados reais**: o widget recebe as mesmas `WidgetProps` que o app entrega. `DEMO_WIDGET_PROPS` (em `demo-data.ts`) é conferido por teste contra a função real `buildWidgetTimeline` para o instante `WIDGET_DEMO_NOW` (11:40). Usamos 11:40, e não os 12:05 do Hoje, porque às 12:05 a Losartana e a Vitamina D já estariam as duas pendentes e o widget mostraria "Nenhuma dose a seguir".
- **Se mudar `src/widgets/*`** (texto, ordem, fonte): atualize `store-widgets.ts` para acompanhar e rode os testes.
- **Layout da tela de bloqueio** (conferido com referências do iOS 16+): data abreviada e widget em linha na **mesma linha**, acima do relógio; relógio grande; widgets retangulares logo abaixo, lado a lado (160×72 pt cada); lanterna e câmera embaixo; barra inicial.
- **Foto de fundo**: `store-assets/source/lock-wallpaper.jpg` ("Misty mountain peaks at sunrise", Julien Riedel, Unsplash License; crédito em `docs/lojas.md`). O céu é claro, então há um escurecimento forte no topo (como o iOS faz) para o texto branco ler. Para trocar a foto, substitua o arquivo (use uma vertical, ≥ 1700 px de largura, de licença livre) e rode a captura.
- **Quando houver build iOS instalado**: compare com uma captura real do aparelho antes de enviar à loja.

## Android (pronto)

Google Play: capturas de telefone entre 320 e 3840 px com proporção de até 2:1 (mínimo 2, ideal 5 a 8); ícone 512×512 e gráfico de destaque 1024×500. O que foi feito:

- **Tamanho** `1080x1920` (`platform: "android"`) em `STORE_SIZES`; os mesmos cálculos proporcionais à largura servem (o layout escala com `width / 1320`), e um teste confere que o texto não chega ao celular nessa proporção (9:16, mais "gorda" que a do iPhone).
- **Só as 5 telas do app** (Hoje, Pacientes, Rotina, Itens, Conta): `slidesFor()` deixa de fora os slides de widgets, porque o Medicron **não tem widgets no Android**. Se um dia existirem, criar um renderer próprio (Glance/Material You) e incluí-los em `slidesFor`.
- **Moldura de celular Android**: câmera em furo (círculo de 34 px), cantos menos arredondados (110 px contra 150 px do iPhone), borda mais fina (20 px) e barra de status com a hora 12:05 (a da demonstração) e a bateria. A barra de gestos fica fora da área visível (o celular sai pela base).
- **Mesmos textos, cores e títulos** do iPhone (identidade única nas duas lojas).
- **Gráfico de destaque** `feature-graphic-1024x500.png`: fundo verde-petróleo, marca, "Lembretes de remédio / para gente e pets" com destaque e o celular com a tela Hoje. Texto mínimo, sem preço, ranking ou promessa (a Google Play rejeita; um teste barra "grátis", "nº 1", "melhor", "baixe" e porcentagens).
- **Ícone 512×512**: não é gerado aqui (é o ícone do app, `apps/app/assets`); exporte em 512×512 para o console.
- **Fidelidade**: as telas são do app **web** no Chrome (fonte Geist, não a do sistema Android). Para fidelidade total (fonte e barra de navegação do Android), capture do emulador/aparelho e substitua o `<img>` do slide; o resto do pipeline não muda.

## Armadilhas já encontradas

- O `sharp` em scripts Node avulsos: importar por `node_modules/sharp/dist/index.cjs` (o `lib/index.js` não existe); nos scripts do repo `import sharp from "sharp"` funciona.
- `spawnSync` do Chrome trava o servidor local da captura: usar o `runChrome` assíncrono (`demo-server.ts`).
- O Chrome headless tem largura mínima de janela em páginas pequenas; para medir layouts estreitos use um `iframe` com a largura desejada. Para as imagens da loja (1320×2868) não há problema.
- A fonte precisa estar carregada antes de medir o título: o script espera `document.fonts.ready`.
- Regex de teste de CSS que usa `[^}]*top:` pega o **último** `top:` da regra; use `[^}]*?;top:` (não guloso) quando a regra tem `padding-top`.
- O Unsplash bloqueia navegador automatizado ("Acesso negado"); para foto nova, baixe pelo navegador normal ou use uma foto própria.
- `import` no topo do arquivo (não no meio) em `store-slides.ts`; `demo-data.ts` não pode importar valores de `@medicron/shared`.
