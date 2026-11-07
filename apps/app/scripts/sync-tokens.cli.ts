// Uso (dentro de apps/app): npm run sync-tokens
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildTokens, colorsModule } from "./sync-tokens.ts";

const root = process.cwd();
const site = readFileSync(path.resolve(root, "../api/src/app/globals.css"), "utf8");
const { css, colors } = buildTokens(site);
writeFileSync(path.resolve(root, "src/global.css"), css);
writeFileSync(path.resolve(root, "src/theme/colors.generated.ts"), colorsModule(colors));
console.log("tokens gerados: src/global.css e src/theme/colors.generated.ts");
