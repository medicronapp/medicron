// Gera os ícones das lojas em store-assets/icons/ a partir de assets/icon.png.  Uso (em apps/app): npm run build-store-icons
import path from "node:path";
import { buildStoreIcons } from "./store-icons.ts";

const appRoot = path.resolve(import.meta.dirname, "..");
const outDir = path.resolve(appRoot, "../../store-assets/icons");
for (const m of await buildStoreIcons(path.join(appRoot, "assets/icon.png"), outDir)) {
  console.log(`${path.relative(path.resolve(appRoot, "../.."), path.join(outDir, m.file))}: ${m.width}x${m.height}, ${(m.bytes / 1024).toFixed(0)} KB`);
}
