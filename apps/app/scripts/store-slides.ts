// Imagens da App Store (iPhone) no mesmo estilo do hotsite: fundo colorido, título, e o celular com a tela REAL do app
// recortado pela base (ou, nos slides de widgets, a tela de bloqueio e a tela inicial com os widgets). Este módulo só monta o HTML de cada slide; quem fotografa é capture-store-shots.cli.ts.

import { DEMO_NOW, DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW } from "./demo-data.ts";
import { renderWidgetScreen } from "./store-widgets.ts";

export type StoreSize = { id: "6.9" | "6.5" | "1080x1920"; platform: "ios" | "android"; width: number; height: number };
/** `app` = captura real de uma tela do app (`route`); `lock` e `home` = widgets do iOS reproduzidos (store-widgets.ts). */
export type StoreSlide = {
  id: string; kind: "app" | "lock" | "home"; route: string;
  /** O título sempre em 2 linhas, com a quebra decidida aqui (não pelo navegador); `title` é as duas juntas. */
  lines: [string, string]; title: string;
  /** Trecho de uma das linhas que ganha a cor da marca. */
  highlight: string;
  subtitle: string; theme: "light" | "dark";
};

/** Tamanhos: iPhone 6,9" e 6,5" (exigidos pela App Store) e telefone Android 1080×1920 (Google Play: 320 a 3840 px, até 2:1). */
export const STORE_SIZES: StoreSize[] = [
  { id: "6.9", platform: "ios", width: 1320, height: 2868 },
  { id: "6.5", platform: "ios", width: 1284, height: 2778 },
  { id: "1080x1920", platform: "android", width: 1080, height: 1920 },
];

/** Os slides de cada plataforma: o iPhone leva todos; o Android só as telas do app (os widgets são do iOS e não valem lá). */
export const slidesFor = (size: StoreSize): StoreSlide[] => (size.platform === "android" ? STORE_SLIDES.filter((s) => s.kind === "app") : STORE_SLIDES);

const slide = (o: Omit<StoreSlide, "title">): StoreSlide => ({ ...o, title: o.lines.join(" ") });

/** Roteiro: as 5 telas de docs/lojas.md, na ordem, e os 2 slides de widgets (iPhone). Textos fiéis ao que o app faz (sem promessa médica). */
export const STORE_SLIDES: StoreSlide[] = [
  slide({ id: "hoje", kind: "app", route: "/", lines: ["Cada dose", "na hora certa"], highlight: "hora certa", subtitle: "Veja o que falta e o que atrasou.", theme: "light" }),
  slide({ id: "pacientes", kind: "app", route: "/pacientes", lines: ["Cada um com", "a sua rotina"], highlight: "a sua rotina", subtitle: "Gente e pets, todos os cuidados em um só lugar.", theme: "dark" }),
  slide({ id: "rotina", kind: "app", route: "/pacientes/pa_ana", lines: ["Monte a rotina", "de cada um"], highlight: "rotina", subtitle: "Medicação ou procedimento, com dose e frequência.", theme: "light" }),
  slide({ id: "itens", kind: "app", route: "/itens", lines: ["Tudo o que entra", "na rotina"], highlight: "rotina", subtitle: "Medicações e procedimentos, cadastrados uma vez.", theme: "dark" }),
  slide({ id: "conta", kind: "app", route: "/conta", lines: ["A família inteira", "no mesmo cuidado"], highlight: "mesmo cuidado", subtitle: "Convide por link: todos veem o que já foi dado.", theme: "light" }),
  slide({ id: "bloqueio", kind: "lock", route: "", lines: ["Widgets na tela", "de bloqueio"], highlight: "bloqueio", subtitle: "A próxima dose e as pendentes, sem abrir o app.", theme: "dark" }),
  slide({ id: "widget", kind: "home", route: "", lines: ["Widgets na", "tela inicial"], highlight: "tela inicial", subtitle: "O anel do dia, as próximas doses e o que está pendente.", theme: "light" }),
];

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** As 2 linhas do título em HTML, com o destaque (uma vez) em <em>. */
function titleHtml(lines: [string, string], highlight: string): string {
  const hi = escapeHtml(highlight);
  let done = false;
  return lines.map((l) => {
    const e = escapeHtml(l);
    if (!done && hi && e.includes(hi)) { done = true; return `<span class="ln">${e.replace(hi, `<em>${hi}</em>`)}</span>`; }
    return `<span class="ln">${e}</span>`;
  }).join(" ");
}

/** Reduz a fonte do título, de 2 em 2 px, até a linha mais larga caber na coluna (depois que a fonte carrega). */
const FIT_SCRIPT = `<script>(function(){function fit(){var h=document.querySelector("h1"),max=h.parentNode.clientWidth,ls=h.querySelectorAll(".ln"),fs=parseFloat(getComputedStyle(h).fontSize);function w(){var m=0;for(var i=0;i<ls.length;i++)m=Math.max(m,ls[i].scrollWidth);return m}while(w()>max&&fs>60){fs-=2;h.style.fontSize=fs+"px"}}(document.fonts&&document.fonts.ready?document.fonts.ready:Promise.resolve()).then(fit)})()</script>`;

/**
 * HTML de um slide. As medidas são proporcionais à largura (referência: 1320), então o 6,5" sai igual ao 6,9" em escala.
 * `fontCss` traz as @font-face (Geist) já embutidas; `screenDataUri` é a captura da tela (PNG/WebP em data URI).
 */
export function renderStoreSlide(slide: StoreSlide, size: StoreSize, screenDataUri: string, fontCss: string, lockWallpaper?: string): string {
  const k = size.width / 1320;
  const px = (n: number) => `${Math.round(n * k * 10) / 10}px`;
  const dark = slide.theme === "dark";
  const droid = size.platform === "android";
  const sbTime = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit", hour12: false }).format(DEMO_NOW);
  const sbColor = dark ? "#fff" : "#10201f";
  // tema escuro: degradê fundo-escuro do site, texto branco; tema claro: o degradê pálido do hero e as cores de texto do site
  const bg = dark
    ? "radial-gradient(90% 38% at 6% 100%,oklch(0.5 0.1 190 / 0.9) 0%,transparent 62%),radial-gradient(70% 28% at 100% 56%,oklch(0.55 0.09 190 / 0.45) 0%,transparent 66%),linear-gradient(170deg,oklch(0.3 0.07 205) 0%,oklch(0.2 0.055 235) 100%)"
    : "linear-gradient(170deg,oklch(0.955 0.03 195) 0%,oklch(0.975 0.01 95) 48%,oklch(0.95 0.03 235) 100%)";
  const page = dark ? "#0b1314" : "#fbfaf7"; // a cor de fundo do site, em volta do cartão
  const hi = dark ? "#7ee7d3" : "#0f766e";
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
body{position:relative;width:${size.width}px;height:${size.height}px;overflow:hidden;font-family:Geist,ui-sans-serif,system-ui,sans-serif;color:${fg};-webkit-font-smoothing:antialiased;background:${page}}
.box{position:absolute;inset:${px(64)};border-radius:${px(110)};overflow:hidden;background:${bg}}
.copy{position:absolute;left:${px(96)};right:${px(96)};top:${px(110)}}
h1{margin:0;font-size:${px(128)};line-height:1.1;letter-spacing:-.028em;font-weight:600}
.ln{display:block;white-space:nowrap}
h1 em{font-style:normal;color:${hi}}
p{margin:${px(34)} 0 0;font-size:${px(54)};line-height:1.45;font-weight:400;color:${sub};text-wrap:balance}
.phone{${frame};position:absolute;left:50%;top:${px(790)};width:${px(1000)};margin-left:${px(-500)};overflow:hidden;border:${px(droid ? 20 : 26)} solid var(--bezel);border-bottom:0;border-radius:${px(droid ? 110 : 150)} ${px(droid ? 110 : 150)} 0 0;outline:${px(3)} solid ${dark ? "rgba(255,255,255,.28)" : "rgba(20,26,27,.18)"};background:var(--screen);padding-top:${px(droid ? 64 : 78)}}
.phone::before{content:"";position:absolute;z-index:2;${droid ? `top:${px(18)};left:50%;width:${px(34)};height:${px(34)};margin-left:${px(-17)};border-radius:50%` : `top:${px(26)};left:50%;width:${px(290)};height:${px(62)};margin-left:${px(-145)};border-radius:999px`};background:var(--bezel)}
${droid ? `.droidsb{position:absolute;z-index:3;top:${px(15)};left:${px(48)};right:${px(44)};display:flex;justify-content:space-between;align-items:center;font-size:${px(27)};font-weight:600;color:${sbColor}}
.droidsb i{display:inline-block;width:${px(26)};height:${px(14)};border-radius:${px(4)};border:${px(2.4)} solid ${sbColor};margin-left:${px(14)}}` : ""}
.phone img{display:block;width:100%;height:auto}
.phone.raw{padding-top:0;background:#000}
</style>
</head>
<body>
<div class="box"><div class="copy"><h1>${titleHtml(slide.lines, slide.highlight)}</h1><p>${escapeHtml(slide.subtitle)}</p></div>
<div class="phone${slide.kind === "app" ? "" : " raw"}">${droid && slide.kind === "app" ? `<div class="droidsb"><span>${sbTime}</span><span><i></i></span></div>` : ""}${slide.kind === "app" ? `<img src="${screenDataUri}" alt="">` : renderWidgetScreen(slide.kind, DEMO_WIDGET_PROPS, WIDGET_DEMO_NOW, k, lockWallpaper)}</div></div>
${FIT_SCRIPT}
</body>
</html>
`;
}
