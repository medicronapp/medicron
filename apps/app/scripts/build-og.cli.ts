// Gera site/og.png (1200x630) a partir de site/og.svg com a Geist embutida. Uso (dentro de apps/app): npm run build-og
import fs from "node:fs";
import path from "node:path";
import { Resvg } from "@resvg/resvg-js";

const appRoot = path.resolve(import.meta.dirname, "..");
const fonts = ["400Regular/Geist_400Regular.ttf", "600SemiBold/Geist_600SemiBold.ttf"].map((f) => {
  for (const base of [path.join(appRoot, "node_modules"), path.join(appRoot, "..", "..", "node_modules")]) {
    const p = path.join(base, "@expo-google-fonts/geist", f);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`fonte não encontrada: ${f}`);
});
const svg = fs.readFileSync(path.join(appRoot, "site/og.svg"), "utf8");
const png = new Resvg(svg, { font: { fontFiles: fonts, loadSystemFonts: false, defaultFontFamily: "Geist" } }).render().asPng();
fs.writeFileSync(path.join(appRoot, "site/og.png"), png);
console.log(`site/og.png gerado (${png.length} bytes)`);
