# Hotsite do Medicron: design

Data: 2026-11-10. Autor do pedido: usuário. Status: **proposta para aprovação** (nada implementado).

> **Direção visual: em redefinição (2026-11-10).** A primeira proposta (herói com celular, grade de cartões com ícone, passos numerados, faixa de degradê) foi rejeitada por parecer um site genérico gerado por IA. O usuário quer um visual peculiar. Três conceitos próprios estão em avaliação (A "Bula", B "Cartela", C "Um dia com o Medicron"); a seção "Estrutura da página" abaixo será reescrita depois da escolha. As decisões de arquitetura (roteamento, cookie, página estática, zero terceiros) **continuam valendo**.

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

## Estrutura da página (uma só, rolável) — rascunho antigo, a reescrever conforme o conceito escolhido

1. **Topo:** logo + "Medicron", links "Entrar" e "Criar conta" (este em destaque).
2. **Herói:** título "Nenhum remédio esquecido. Todo mundo da casa na mesma página." (é a frase do painel de entrada do app); subtítulo; botões **Criar conta grátis** → `/cadastrar` e **Já tenho conta** → `/entrar`; três garantias ("Grátis, sem anúncios", "Não vendemos seus dados", "iPhone, Android e web"); ao lado, um celular desenhado em HTML/CSS com a tela Hoje (anel, sequência, cartões de dose).
3. **Como funciona:** três passos (criar conta, cadastrar quem você cuida, receber lembretes).
4. **Recursos:** seis cartões (lembretes, pessoas e pets, família na mesma conta, o dia de relance, iPhone/Android/web, seus dados sob seu controle).
5. **Widgets e lojas:** o widget do iPhone desenhado em HTML/CSS, mais selos "Em breve" da App Store e do Google Play (viram links quando as URLs existirem).
6. **Chamada final** em degradê verde, com os dois botões.
7. **Rodapé:** aviso "organizador de lembretes, não faz diagnóstico nem indica doses", links para Política de privacidade (`/privacidade`), Contato e Entrar.

## Conteúdo, fatos e limites

Todo texto é fiel ao app (checado contra `docs/lojas.md` e a política de privacidade). Não afirmar nada que o app não faz: sem "avisos de interação", "receitas", "integração com farmácias". Aviso de que não é dispositivo médico no rodapé e nas fichas das lojas.

## SEO, compartilhamento e acessibilidade

`<html lang="pt-BR">`, `title` (≤ 60), `description` (≤ 160), `canonical`, Open Graph e Twitter com imagem 1200×630, `theme-color` por tema, JSON-LD `SoftwareApplication`, `robots.txt` e `sitemap.xml` (`/` e `/privacidade`). Um só `h1`, marcos (`header`, `main`, `footer`), link "Pular para o conteúdo", foco visível, contraste AA (≥ 4,5) com os pares de cor usados, respeito a `prefers-reduced-motion`, alvos de toque ≥ 44 px, imagens decorativas com `aria-hidden`.

## Riscos e como tratar

- **Cookie com nome diferente** (se o `better-auth` mudar o prefixo): o hotsite apareceria para quem está logado. Mitigação: o nome do cookie vem de uma constante testada contra a configuração real do `better-auth` na API.
- **Cookie expirado ainda presente:** a pessoa vê o app, que a leva à entrada. Aceito (raro).
- **Cache da borda:** a decisão acontece no roteamento, antes do cache de arquivos; conferir com `vercel curl` em pré-visualização (com e sem cookie) antes de publicar.
- **Reversão:** voltar o `vercel.json` anterior e o nome `index.html` (um commit), ou `vercel rollback`.

## Decisões em aberto (precisam do usuário)

1. Escopo: a página acima, mais enxuta ou mais completa (perguntas frequentes)?
2. Selos das lojas: ficam como "Em breve" até as URLs existirem (recomendado) ou ocultos?
3. E-mail de contato: definir `CONTACT_EMAIL` também no projeto `medicron-web` (a página mostra o link só se existir).
4. Imagem de compartilhamento (1200×630): gerada a partir de um SVG com o logo e a frase do herói (recomendado) ou a partir de uma captura real do app?
