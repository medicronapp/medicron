// Gera as imagens das lojas: App Store (iPhone 6,9" e 6,5") em store-assets/ios/<tamanho>/NN-tela.png, Google Play (telefone
// 1080×1920, só as telas do app) em store-assets/android/1080x1920/NN-tela.png e o gráfico de destaque 1024×500.
// Uso (dentro de apps/app, com o app já exportado em dist/ por `expo export -p web` + finalize-web):
//   npm run capture-store-shots
// Fotografa as telas REAIS do app (servidor de demonstração, relógio congelado) e as compõe com o estilo do hotsite.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { runChrome, startDemoServer } from "./demo-server.ts";
import { FEATURE_SIZE, renderFeatureGraphic } from "./store-feature.ts";
import { renderStoreSlide, slidesFor, STORE_SIZES, STORE_SLIDES } from "./store-slides.ts";

const appRoot = path.resolve(import.meta.dirname, "..");
const outRoot = path.resolve(appRoot, "../../store-assets");
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const wallpaper = `data:image/jpeg;base64,${fs.readFileSync(path.resolve(appRoot, "../../store-assets/source/lock-wallpaper.jpg")).toString("base64")}`;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "medicron-store-"));

const fontFile = (weight: 400 | 600) => path.resolve(appRoot, `../../node_modules/@fontsource/geist/files/geist-latin-${weight}-normal.woff2`);
const fontCss = ([400, 600] as const)
  .map((w) => `@font-face{font-family:Geist;font-weight:${w};src:url(data:font/woff2;base64,${fs.readFileSync(fontFile(w)).toString("base64")}) format("woff2")}`)
  .join("\n");

const demo = await startDemoServer(path.join(appRoot, "dist"), CHROME);
try {
  // 1) a tela real de cada slide, em 390×844 pt a 3x (1170×2532), tema de cada slide (alternam claro e escuro)
  const raws = new Map<string, string>();
  for (const s of STORE_SLIDES.filter((x) => x.kind === "app")) {
    const png = path.join(tmp, `raw-${s.id}.png`);
    await demo.shoot({ route: s.route, theme: s.theme, width: 390, height: 844, scale: 3, out: png });
    raws.set(s.id, `data:image/png;base64,${fs.readFileSync(png).toString("base64")}`);
  }
  if (demo.missing.size) console.warn("Requisições sem resposta simulada:", [...demo.missing].join(", "));

  // 2) a composição de cada slide em cada tamanho
  for (const size of STORE_SIZES) {
    const dir = path.join(outRoot, size.platform, size.id);
    fs.mkdirSync(dir, { recursive: true });
    for (const [i, s] of slidesFor(size).entries()) {
      const html = path.join(tmp, `${size.platform}-${size.id}-${s.id}.html`);
      const shot = path.join(tmp, `${size.platform}-${size.id}-${s.id}.png`);
      fs.writeFileSync(html, renderStoreSlide(s, size, raws.get(s.id) ?? "", fontCss, wallpaper));
      const r = await runChrome(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${size.width},${size.height}`, "--force-device-scale-factor=1", "--virtual-time-budget=5000", `--screenshot=${shot}`, `file://${html}`]);
      if (r.code !== 0 || !fs.existsSync(shot)) throw new Error(`Chrome falhou em ${size.id}/${s.id}: ${r.stderr.slice(-200)}`);
      const out = path.join(dir, `${String(i + 1).padStart(2, "0")}-${s.id}.png`);
      // a App Store não aceita transparência: achata sobre branco e garante o tamanho exato
      const info = await sharp(shot).resize(size.width, size.height, { fit: "cover", position: "top" }).flatten({ background: "#ffffff" }).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
      console.log(`${path.relative(path.resolve(appRoot, "../.."), out)}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
    }
  }

  // 3) gráfico de destaque da Google Play (1024×500) com a tela Hoje
  {
    const html = path.join(tmp, "feature.html");
    const shot = path.join(tmp, "feature.png");
    fs.writeFileSync(html, renderFeatureGraphic(raws.get("hoje")!, fontCss));
    const r = await runChrome(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${FEATURE_SIZE.width},${FEATURE_SIZE.height}`, "--force-device-scale-factor=1", "--virtual-time-budget=5000", `--screenshot=${shot}`, `file://${html}`]);
    if (r.code !== 0 || !fs.existsSync(shot)) throw new Error(`Chrome falhou no gráfico de destaque: ${r.stderr.slice(-200)}`);
    fs.mkdirSync(path.join(outRoot, "android"), { recursive: true });
    const out = path.join(outRoot, "android", `feature-graphic-${FEATURE_SIZE.width}x${FEATURE_SIZE.height}.png`);
    const info = await sharp(shot).resize(FEATURE_SIZE.width, FEATURE_SIZE.height, { fit: "cover", position: "top" }).flatten({ background: "#ffffff" }).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
    console.log(`${path.relative(path.resolve(appRoot, "../.."), out)}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
  }
} finally {
  demo.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
