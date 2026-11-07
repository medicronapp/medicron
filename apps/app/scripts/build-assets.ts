// Gera os ícones do app a partir do logo Ciclo. Uso (dentro de apps/app): npm run build-assets
import { mkdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const GREEN = "#0f766e";
const defs = `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#19c2b0"/><stop offset="1" stop-color="${GREEN}"/></linearGradient></defs>`;

/** O logo (anel + ponto) numa caixa de 64, centralizado numa tela de 512 e ocupando `fraction` dela. */
function glyph(fraction: number, ring: string, dot: string): string {
  const scale = (512 * fraction) / 64;
  const offset = (512 - 64 * scale) / 2;
  return `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke-linecap="round">
    <circle cx="32" cy="32" r="20" stroke="${ring}" stroke-width="6" stroke-dasharray="104 21.7" transform="rotate(-90 32 32)"/>
    <circle cx="22" cy="14.7" r="5.2" fill="${dot}" stroke="none"/></g>`;
}
const canvas = (body: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">${defs}${body}</svg>`;

const SVGS = {
  icon: canvas(`<rect width="512" height="512" fill="url(#g)"/>${glyph(0.6, "#fff", "#99f6e4")}`),
  foreground: canvas(glyph(0.6, "#fff", "#99f6e4")),
  splash: canvas(glyph(0.6, "#fff", "#99f6e4")),
  favicon: canvas(`<rect width="512" height="512" rx="112" fill="url(#g)"/>${glyph(0.8, "#fff", "#99f6e4")}`),
  notification: canvas(glyph(0.8, "#fff", "#fff")),
};

async function render(svg: string, size: number) {
  return sharp(Buffer.from(svg), { density: (72 * size) / 512 }).resize(size, size);
}

async function main() {
  const out = path.resolve(process.cwd(), "assets");
  mkdirSync(out, { recursive: true });
  // O ícone do iOS não pode ter canal alfa: achata sobre o verde e remove o canal.
  (await render(SVGS.icon, 1024)).flatten({ background: GREEN }).removeAlpha().png().toFile(path.join(out, "icon.png"));
  (await render(SVGS.foreground, 1024)).png().toFile(path.join(out, "adaptive-icon-foreground.png"));
  (await render(SVGS.splash, 1024)).png().toFile(path.join(out, "splash-icon.png"));
  (await render(SVGS.favicon, 48)).png().toFile(path.join(out, "favicon.png"));
  (await render(SVGS.notification, 96)).png().toFile(path.join(out, "notification-icon.png"));
  console.log("ícones gerados em assets/");
}
main();
