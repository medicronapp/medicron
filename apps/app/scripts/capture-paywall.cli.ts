// Imagens da tela de planos e da oferta de boas-vindas, fotografadas do app web REAL com preços de exemplo e conta no plano grátis.
// Uso (dentro de apps/app): npm run capture-paywall           (gera em store-assets/paywall/)
// Faz um build web especial (EXPO_PUBLIC_PREVIEW_PAYWALL=1); o app e a web de verdade não mudam.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { startDemoServer } from "./demo-server.ts";

const appRoot = path.resolve(import.meta.dirname, "..");
const outDir = path.resolve(appRoot, "../../store-assets/paywall");
const env = { ...process.env, EXPO_PUBLIC_PREVIEW_PAYWALL: "1", DEMO_TIER: "free" };
execFileSync("npx", ["expo", "export", "-p", "web"], { cwd: appRoot, env, stdio: "inherit" });
execFileSync("node", ["scripts/finalize-web.cli.ts"], { cwd: appRoot, env, stdio: "inherit" });

process.env.DEMO_TIER = "free";
fs.mkdirSync(outDir, { recursive: true });
const demo = await startDemoServer(path.join(appRoot, "dist"));
try {
  const shots: { name: string; route: string }[] = [
    { name: "limite-pacientes", route: "/plus?motivo=patients" },
    { name: "limite-pessoas", route: "/plus?motivo=members" },
    { name: "oferta-boas-vindas", route: "/oferta-boas-vindas" },
  ];
  for (const theme of ["light", "dark"] as const) {
    for (const s of shots) {
      const out = path.join(outDir, `${s.name}-${theme === "light" ? "claro" : "escuro"}.png`);
      await demo.shoot({ route: s.route, theme, width: 390, height: 844, scale: 2, out });
      console.log(path.relative(path.resolve(appRoot, "../.."), out));
    }
  }
  // Imagem de revisão da Apple (iPhone 6,5", 1242×2688): a oferta de boas-vindas, tema claro, sem alterar nada além do tamanho.
  const review = path.join(outDir, "review-oferta-boas-vindas-1242x2688.png");
  await demo.shoot({ route: "/oferta-boas-vindas", theme: "light", width: 414, height: 896, scale: 3, out: review });
  console.log(path.relative(path.resolve(appRoot, "../.."), review));
} finally {
  demo.close();
}
