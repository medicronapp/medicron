# Hotsite do Medicron: design

> **Ajuste de 2026-11-10 (feedback do usuário):** a página ficou mais larga (1080 px) e a captura do app foi para o **lado direito do título** (hero em duas colunas no computador; uma coluna no celular). Depois, o texto da esquerda passou a **acompanhar a altura da captura**: título e texto no topo, botões num ponto intermediário e a linha de disponibilidade no pé, alinhada à legenda (sem fundo de gradiente, cantos arredondados nem destaque atrás do app). O desenho em HTML da tela foi trocado por **capturas reais do app** (claro e escuro), geradas por `npm run capture-site-shots` (o app web real contra uma API simulada, relógio congelado em 10/11/2026 12:05).

Data: 2026-11-10. Autor do pedido: usuário. Status: **implementado** (Plano 10); publicação em produção conforme `docs/passos-do-usuario.md`, seção H.

> **Direção visual escolhida (2026-11-10): minimalista, coluna única.** Descartadas: a proposta de molde de site de produto (parecia gerada por IA) e os conceitos "Bula", "Cartela" e "Um dia" (forçados). Regra: nenhum recurso decorativo (sem degradê, sombra pesada, ícone em círculo, pílula de rótulo, faixa de CTA, herói centralizado); texto específico; uma só cor de ação; filetes finos; a tela do app como imagem.

## Intenção

Hoje quem abre `medicron.com.br` sem estar logado cai direto na tela de entrada. A ideia é que a **raiz do site, para quem não está logado, seja um hotsite do app**: uma página simples que explica o produto no mesmo visual do app e leva a **Criar conta** (`/cadastrar`) ou **Entrar** (`/entrar`). Quem está logado continua indo direto para a tela Hoje.

Serve também como a "URL de marketing" exigida pela App Store e como porta de entrada para indexação (SEO) e para compartilhar o link (pré-visualização com imagem e texto).

## Objetivos, não objetivos e anti-objetivos

- **Objetivos:** carregar rápido; mesmo visual do app (mesmos tokens de cor, raio, logo, degradê, cartões, pílulas); chamar para criar conta e entrar; funcionar em celular e computador, claro e escuro; ser bom para busca e para pré-visualização de link; texto em português fiel ao que o app faz.
- **Não objetivos:** blog, preços, painel, múltiplas páginas, formulário de contato, análise de uso (a política de privacidade diz que não rastreamos), depoimentos (não há conteúdo real ainda).
- **Anti-objetivos (seria fracasso mesmo que "funcione"):** o app ficar mais lento para quem está logado; quem está logado ver o hotsite (ou o contrário: o visitante cair numa tela em branco); promessas médicas ("trata", "cura", "dose certa"); dependências de terceiros (fontes, scripts, rastreadores) que contradigam a política de privacidade.

## Decisões de arquitetura (e por quê)

1. **Página estática separada, não uma rota dentro do app Expo.** O app web é uma SPA sem pré-renderização (`output: "single"`): uma rota dentro dele exigiria baixar todo o pacote do app (mais de 1 MB) para mostrar texto, teria primeiro desenho lento, pré-visualização de link ruim (as metas são do app todo) e indexação fraca. Uma página HTML + CSS escritos à mão, com o CSS dos tokens do app, abre quase instantânea.
2. **Quem decide "hotsite ou app" é a Vercel, na borda, pelo cookie de sessão.** O cookie do `better-auth` é HttpOnly (a página não consegue lê-lo), então a decisão tem que ser do roteador: `rewrite` de `/` com condição `has: cookie` (existe e é suportado). Sem o cookie: hotsite. Com o cookie: app. Dentro do app, nada muda.
3. **O arquivo `index.html` do app precisa sair da raiz.** A documentação da Vercel diz que o sistema de arquivos tem precedência sobre os rewrites; como o `/` hoje é o arquivo `index.html`, o rewrite nunca valeria. Depois do `expo export`, um passo de build renomeia `dist/index.html` para `dist/app.html`; o fallback do app passa a apontar para `/app.html` e `/index.html` redireciona para `/`.
4. **PWA instalado:** o `start_url` do manifesto passa a `/?source=pwa` e uma regra de `rewrite` manda esse caso sempre ao app (quem instalou o app e está deslogado cai na tela de entrada, não no hotsite).
5. **Apps nativos não mudam:** continuam abrindo na tela de entrada. O hotsite é só da web.
6. **Mesma identidade, sem copiar valores à mão:** o CSS dos tokens do hotsite é extraído do `src/global.css` do app na build (que por sua vez é gerado do `globals.css` da API), e o logo "Ciclo" é o mesmo SVG do `BrandMark`. Se as cores mudarem, o hotsite acompanha.
7. **Tema:** segue o sistema (`prefers-color-scheme`) e, se existir, a escolha da pessoa no app (`localStorage["medicron.theme"]`, mesma origem), com o mesmo mecanismo `data-theme` do app.
8. **Zero terceiros:** nenhuma fonte, script, imagem ou métrica de outro domínio. Fonte: a do sistema (SF/Roboto/Segoe), no mesmo espírito do app nativo.

## Estrutura da página (largura máxima de 1080 px, margens de 32 px; hero em duas colunas)

1. **Topo:** logo pequeno (o do app) e "Medicron", à esquerda; "Entrar" em texto, à direita. Sem barra, sem menu.
2. **Título e texto** (alinhados à esquerda, bastante respiro acima): "Lembretes de remédio para quem cuida de gente e de bicho." / "O Medicron avisa na hora de cada dose e mostra para a família inteira o que já foi dado, para ninguém esquecer nem repetir."
3. **Ação:** botão **Criar conta** (`/cadastrar`, o único elemento sólido da página) e link **Já tenho conta →** (`/entrar`). Abaixo, uma linha pequena e **verdadeira** sobre onde funciona (ver "Disponibilidade").
4. **A tela do app:** a tela Hoje, com a legenda "A tela Hoje: o que falta e o que atrasou." Exemplo: conta "Família Souza", "3 de 5 doses feitas hoje", Vermífugo · Mel · 07:00 (Feita), Vitamina D · Pedro · 08:00 (Atrasada), Losartana · Ana · 12:00 (Agora), em ordem de horário.
5. **"Em poucas palavras":** lista de definições (termo à esquerda, explicação à direita, filete entre as linhas): Lembretes; Gente e pets; Em família; No iPhone (widgets na tela inicial e de bloqueio); Seus dados (apagar a conta e tudo o que cadastrou, no app).
6. **Rodapé:** aviso "O Medicron é um organizador de lembretes. Não faz diagnóstico nem indica doses ou tratamentos: siga a orientação do seu médico ou veterinário." e os links Política de privacidade (`/privacidade`) e Contato (só se `CONTACT_EMAIL` existir na build).

**Visual:** tokens de cor e raio do app, extraídos do `global.css` na build; verde de ação em botão e links; vermelho só em "Atrasada"; Geist (400 e 600) servida do próprio site em `woff2`; título 46 px (34 px no celular), texto 19 px / 16,5 px, entrelinha 1,55 a 1,6; botão de 46 px de altura e raio de 11 px; links sublinhados com filete. Sem animações. Claro e escuro automáticos.

**Disponibilidade (não prometer o que não existe):** a linha pequena abaixo do botão e o texto "No iPhone" dependem do que já foi publicado. Hoje: "Grátis, sem anúncios. Funciona no navegador; aplicativos para iPhone e Android em breve." Com as URLs das lojas definidas na build (`LANDING_APP_STORE_URL`, `LANDING_PLAY_URL`), a linha vira "Grátis, sem anúncios. No iPhone, no Android e no navegador." e aparecem os links das lojas.

**A tela do app como imagem:** capturas **reais** do app (`site/hoje-claro.webp` e `site/hoje-escuro.webp`, 390×760 pt a 2x, ~50 KB cada), uma por tema; só a do tema em uso é exibida e baixada (`loading="lazy"`). Para atualizar depois de mudar a tela Hoje: `npm run build:web`-equivalente (`expo export -p web` + `finalize-web`) e `npm run capture-site-shots`.

## Conteúdo, fatos e limites

Todo texto é fiel ao app (checado contra `docs/lojas.md` e a política de privacidade). Não afirmar nada que o app não faz: sem "avisos de interação", "receitas", "integração com farmácias". Aviso de que não é dispositivo médico no rodapé e nas fichas das lojas.

## SEO, compartilhamento e acessibilidade

`<html lang="pt-BR">`, `title` (≤ 60), `description` (≤ 160), `canonical`, Open Graph e Twitter com imagem 1200×630, `theme-color` por tema, JSON-LD `SoftwareApplication`, `robots.txt` e `sitemap.xml` (`/` e `/privacidade`). Um só `h1`, marcos (`header`, `main`, `footer`), link "Pular para o conteúdo", foco visível, contraste AA (≥ 4,5) com os pares de cor usados, respeito a `prefers-reduced-motion`, alvos de toque ≥ 44 px, imagens decorativas com `aria-hidden`.

## Riscos e como tratar

- **Cookie com nome diferente** (se o `better-auth` mudar o prefixo): o hotsite apareceria para quem está logado. Mitigação: o nome do cookie vem de uma constante testada contra a configuração real do `better-auth` na API.
- **Cookie expirado ainda presente:** a pessoa vê o app, que a leva à entrada. Aceito (raro).
- **Cache da borda:** a decisão acontece no roteamento, antes do cache de arquivos; conferir com `vercel curl` em pré-visualização (com e sem cookie) antes de publicar.
- **Reversão:** voltar o `vercel.json` anterior e o nome `index.html` (um commit), ou `vercel rollback`.

## Decisões em aberto (têm padrão; o usuário pode mudar)

1. Escopo: a página acima, mais enxuta ou mais completa (perguntas frequentes)?
2. Selos das lojas: ficam como "Em breve" até as URLs existirem (recomendado) ou ocultos?
3. E-mail de contato: definir `CONTACT_EMAIL` também no projeto `medicron-web` (a página mostra o link só se existir).
4. Imagem de compartilhamento (1200×630): gerada a partir de um SVG com o logo e a frase do herói (recomendado) ou a partir de uma captura real do app?
