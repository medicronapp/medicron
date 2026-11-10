// Imagens da App Store (iPhone) no mesmo estilo do hotsite: fundo colorido, título, e o celular com a tela REAL do app
// recortado pela base. Este módulo só monta o HTML de cada slide; quem fotografa é capture-store-shots.cli.ts.

export type StoreSize = { id: "6.9" | "6.5"; width: number; height: number };
export type StoreSlide = { id: string; route: string; title: string; subtitle: string; theme: "light" | "dark" };

/** Tamanhos de captura exigidos para iPhone (docs/lojas.md). */
export const STORE_SIZES: StoreSize[] = [
  { id: "6.9", width: 1320, height: 2868 },
  { id: "6.5", width: 1284, height: 2778 },
];

/** Roteiro: as 5 telas de docs/lojas.md, na ordem. Textos fiéis ao que o app faz (sem promessa médica). */
export const STORE_SLIDES: StoreSlide[] = [
  { id: "hoje", route: "/", title: "Cada dose na hora certa", subtitle: "Veja o que falta e o que atrasou.", theme: "light" },
  { id: "pacientes", route: "/pacientes", title: "Gente e pets, cada um com a sua rotina", subtitle: "Todos os cuidados da casa em um só lugar.", theme: "dark" },
  { id: "rotina", route: "/pacientes/pa_ana", title: "Monte a rotina de cada um", subtitle: "Medicação ou procedimento, com dose e frequência.", theme: "light" },
  { id: "itens", route: "/itens", title: "Tudo o que entra na rotina", subtitle: "Medicações e procedimentos, cadastrados uma vez.", theme: "dark" },
  { id: "conta", route: "/conta", title: "A família inteira no mesmo cuidado", subtitle: "Convide por link: todos veem o que já foi dado.", theme: "light" },
];

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * HTML de um slide. As medidas são proporcionais à largura (referência: 1320), então o 6,5" sai igual ao 6,9" em escala.
 * `fontCss` traz as @font-face (Geist) já embutidas; `screenDataUri` é a captura da tela (PNG/WebP em data URI).
 */
export function renderStoreSlide(slide: StoreSlide, size: StoreSize, screenDataUri: string, fontCss: string): string {
  const k = size.width / 1320;
  const px = (n: number) => `${Math.round(n * k * 10) / 10}px`;
  const dark = slide.theme === "dark";
  // tema escuro: degradê fundo-escuro do site, texto branco; tema claro: o degradê pálido do hero e as cores de texto do site
  const bg = dark
    ? "radial-gradient(90% 38% at 6% 100%,oklch(0.5 0.1 190 / 0.9) 0%,transparent 62%),radial-gradient(70% 28% at 100% 56%,oklch(0.55 0.09 190 / 0.45) 0%,transparent 66%),linear-gradient(170deg,oklch(0.3 0.07 205) 0%,oklch(0.2 0.055 235) 100%)"
    : "linear-gradient(170deg,oklch(0.955 0.03 195) 0%,oklch(0.975 0.01 95) 48%,oklch(0.95 0.03 235) 100%)";
  const fg = dark ? "#fff" : "oklch(0.21 0.015 200)";
  const sub = dark ? "rgba(255,255,255,.7)" : "oklch(0.5 0.015 200)";
  const frame = dark ? "--bezel:#2b3436;--screen:#0b1314" : "--bezel:#141a1b;--screen:#fbfaf7";
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<style>${fontCss}
*{box-sizing:border-box}
html,body{margin:0}
body{position:relative;width:${size.width}px;height:${size.height}px;overflow:hidden;font-family:Geist,ui-sans-serif,system-ui,sans-serif;color:${fg};-webkit-font-smoothing:antialiased;
background:${bg}}
.copy{position:absolute;left:${px(96)};right:${px(96)};top:${px(140)}}
h1{margin:0;font-size:${px(128)};line-height:1.1;letter-spacing:-.028em;font-weight:600;text-wrap:balance}
p{margin:${px(34)} 0 0;font-size:${px(54)};line-height:1.45;font-weight:400;color:${sub};text-wrap:balance}
.phone{${frame};position:absolute;left:50%;top:${px(830)};width:${px(1000)};margin-left:${px(-500)};overflow:hidden;border:${px(26)} solid var(--bezel);border-bottom:0;border-radius:${px(150)} ${px(150)} 0 0;outline:${px(3)} solid ${dark ? "rgba(255,255,255,.28)" : "rgba(20,26,27,.18)"};background:var(--screen);padding-top:${px(78)}}
.phone::before{content:"";position:absolute;z-index:2;top:${px(26)};left:50%;width:${px(290)};height:${px(62)};margin-left:${px(-145)};border-radius:999px;background:var(--bezel)}
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
