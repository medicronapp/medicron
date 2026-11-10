// Imagens da App Store (iPhone) no mesmo estilo do hotsite: fundo colorido, título, e o celular com a tela REAL do app
// recortado pela base. Este módulo só monta o HTML de cada slide; quem fotografa é capture-store-shots.cli.ts.

export type StoreSize = { id: "6.9" | "6.5"; width: number; height: number };
export type StoreSlide = { id: string; route: string; title: string; subtitle: string };

/** Tamanhos de captura exigidos para iPhone (docs/lojas.md). */
export const STORE_SIZES: StoreSize[] = [
  { id: "6.9", width: 1320, height: 2868 },
  { id: "6.5", width: 1284, height: 2778 },
];

/** Roteiro: as 5 telas de docs/lojas.md, na ordem. Textos fiéis ao que o app faz (sem promessa médica). */
export const STORE_SLIDES: StoreSlide[] = [
  { id: "hoje", route: "/", title: "Cada dose na hora certa", subtitle: "Veja o que falta e o que atrasou." },
  { id: "pacientes", route: "/pacientes", title: "Gente e pets, cada um com a sua rotina", subtitle: "Todos os cuidados da casa em um só lugar." },
  { id: "rotina", route: "/pacientes/pa_ana", title: "Monte a rotina de cada um", subtitle: "Medicação ou procedimento, com dose e frequência." },
  { id: "itens", route: "/itens", title: "Tudo o que entra na rotina", subtitle: "Medicações e procedimentos, cadastrados uma vez." },
  { id: "conta", route: "/conta", title: "A família inteira no mesmo cuidado", subtitle: "Convide por link: todos veem o que já foi dado." },
];

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * HTML de um slide. As medidas são proporcionais à largura (referência: 1320), então o 6,5" sai igual ao 6,9" em escala.
 * `fontCss` traz as @font-face (Geist) já embutidas; `screenDataUri` é a captura da tela (PNG/WebP em data URI).
 */
export function renderStoreSlide(slide: StoreSlide, size: StoreSize, screenDataUri: string, fontCss: string): string {
  const k = size.width / 1320;
  const px = (n: number) => `${Math.round(n * k * 10) / 10}px`;
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>${fontCss}
*{box-sizing:border-box}
html,body{margin:0}
body{position:relative;width:${size.width}px;height:${size.height}px;overflow:hidden;font-family:Geist,ui-sans-serif,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased;
background:radial-gradient(90% 40% at 8% 100%,oklch(0.72 0.13 185) 0%,transparent 62%),radial-gradient(70% 30% at 100% 56%,oklch(0.8 0.11 185 / 0.6) 0%,transparent 66%),linear-gradient(170deg,oklch(0.46 0.1 195) 0%,oklch(0.33 0.08 228) 100%)}
.copy{position:absolute;left:${px(96)};right:${px(96)};top:${px(210)}}
h1{margin:0;font-size:${px(112)};line-height:1.06;letter-spacing:-.03em;font-weight:600;text-wrap:balance}
p{margin:${px(34)} 0 0;font-size:${px(50)};line-height:1.3;font-weight:400;color:rgba(255,255,255,.86);text-wrap:balance}
.phone{position:absolute;left:50%;top:${px(900)};width:${px(1000)};margin-left:${px(-500)};overflow:hidden;border:${px(26)} solid #141a1b;border-bottom:0;border-radius:${px(150)} ${px(150)} 0 0;outline:${px(3)} solid rgba(255,255,255,.28);background:#fbfaf7;padding-top:${px(78)}}
.phone::before{content:"";position:absolute;z-index:2;top:${px(26)};left:50%;width:${px(290)};height:${px(62)};margin-left:${px(-145)};border-radius:999px;background:#141a1b}
.phone img{display:block;width:100%;height:auto}
</style>
</head>
<body>
<div class="copy"><h1>${escapeHtml(slide.title)}</h1><p>${escapeHtml(slide.subtitle)}</p></div>
<div class="phone"><img src="${screenDataUri}" alt=""></div>
</body>
</html>
`;
}
