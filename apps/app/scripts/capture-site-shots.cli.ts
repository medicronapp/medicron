// Gera as capturas de tela REAIS do app para o hotsite (site/hoje-*.webp: tela Hoje; site/familia-*.webp: tela Conta).
// Uso (dentro de apps/app, com o app já exportado em dist/ por `expo export -p web` + finalize-web):
//   npm run capture-site-shots
// Usa o servidor de demonstração (scripts/demo-server.ts): o app web real contra uma API simulada, com o relógio congelado
// em 10/11/2026 12:05, fotografado pelo Google Chrome em 390 pt de largura (2x), em claro e escuro.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { startDemoServer } from "./demo-server.ts";

const appRoot = path.resolve(import.meta.dirname, "..");
const WIDTH = 390, HEIGHT = 760, SCALE = 2;

const demo = await startDemoServer(path.join(appRoot, "dist"));
try {
  for (const [route, theme, file] of [
    ["/", "light", "hoje-claro"], ["/", "dark", "hoje-escuro"], ["/conta", "light", "familia-claro"], ["/conta", "dark", "familia-escuro"],
  ] as const) {
    const png = path.join(os.tmpdir(), `medicron-shot-${file}.png`);
    await demo.shoot({ route, theme, width: WIDTH, height: HEIGHT, scale: SCALE, out: png });
    const out = path.join(appRoot, `site/${file}.webp`);
    const info = await sharp(png).webp({ quality: 84 }).toFile(out);
    console.log(`${path.relative(appRoot, out)}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
    fs.rmSync(png);
  }
  if (demo.missing.size) console.warn("Requisições sem resposta simulada:", [...demo.missing].join(", "));
} finally {
  demo.close();
}
