// Gráfico de destaque da Google Play (1024×500): marca, a frase do site em 2 linhas e o celular com a tela Hoje.
// Mesmo estilo das capturas (docs/imagens-da-loja.md). Texto mínimo: nome e frase, sem preço, ranking ou promessa.

export const FEATURE_SIZE = { width: 1024, height: 500 };

const mark = '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect width="64" height="64" rx="16" fill="#0f766e"/><circle cx="32" cy="32" r="17" stroke="#f3fbfa" stroke-width="5.5" stroke-linecap="round" stroke-dasharray="89 18" transform="rotate(-90 32 32)"/><circle cx="23.5" cy="17.5" r="4.2" fill="#99f6e4"/></svg>';

/** `screenDataUri` é a captura da tela Hoje (tema claro); `fontCss` traz as @font-face da Geist embutidas. */
export function renderFeatureGraphic(screenDataUri: string, fontCss: string): string {
  const { width, height } = FEATURE_SIZE;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>${fontCss}
*{box-sizing:border-box}
html,body{margin:0}
body{position:relative;width:${width}px;height:${height}px;overflow:hidden;font-family:Geist,ui-sans-serif,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;background:radial-gradient(70% 90% at 100% 100%,oklch(0.5 0.1 190 / .85) 0%,transparent 62%),linear-gradient(160deg,oklch(0.3 0.07 205) 0%,oklch(0.2 0.055 235) 100%)}
.brand{position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:14px;font-size:30px;font-weight:600;letter-spacing:-.01em}
.brand svg{width:46px;height:46px;display:block}
h1{position:absolute;left:64px;top:170px;margin:0;font-size:58px;line-height:1.1;letter-spacing:-.028em;font-weight:600}
.ln{display:block;white-space:nowrap}
h1 em{font-style:normal;color:#7ee7d3}
.phone{position:absolute;left:690px;top:64px;width:260px;overflow:hidden;border:11px solid #2b3436;border-bottom:0;border-radius:48px 48px 0 0;background:#fbfaf7;padding-top:30px;outline:1.5px solid rgba(255,255,255,.28)}
.phone::before{content:"";position:absolute;top:9px;left:50%;width:14px;height:14px;margin-left:-7px;border-radius:50%;background:#2b3436;z-index:2}
.phone img{display:block;width:100%;height:auto}
</style>
</head>
<body>
<div class="brand">${mark}<span>Medicron</span></div>
<h1><span class="ln">Lembretes de remédio</span><span class="ln">para <em>gente e pets</em></span></h1>
<div class="phone"><img src="${screenDataUri}" alt=""></div>
</body>
</html>
`;
}
