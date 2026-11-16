// Gera a imagem de revisão da assinatura para o App Store Connect: a tela do Plus (planos) em iPhone 6,5" (1242×2688).
// Uso (dentro de apps/app): node scripts/build-review-shot.cli.ts
// A tela real do Plus só carrega planos no aparelho (a versão web não vende), então esta imagem reproduz a tela com os
// MESMOS textos, preços e cores de `src/app/(app)/plus.tsx` e do `global.css`. Se a tela mudar, atualize aqui.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { runChrome } from "./demo-server.ts";

const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const outDir = path.resolve(import.meta.dirname, "../../../store-assets/ios");
const W = 414, H = 896, SCALE = 3; // 1242×2688

const check = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="oklch(0.34 0.06 190)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const benefit = (t: string) => `<div class="row">${check}<span>${t}</span></div>`;
const plan = (label: string, on: boolean) => `<div class="plan ${on ? "on" : ""}">${label}</div>`;

const html = `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><style>
:root{--bg:oklch(0.985 .004 95);--fg:oklch(.21 .015 200);--card:#fff;--primary:oklch(.48 .09 190);--muted:oklch(.5 .015 200);--border:oklch(.92 .008 95);--soft:oklch(.95 .025 190);--link:oklch(.42 .09 190)}
*{box-sizing:border-box;margin:0}
body{width:${W}px;height:${H}px;background:var(--bg);color:var(--fg);font-family:-apple-system,"SF Pro Text","Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased}
.status{height:54px;padding:18px 32px 0;display:flex;justify-content:space-between;font-weight:600;font-size:16px}
.head{display:flex;align-items:center;gap:8px;padding:8px 12px 0}
.head h1{font-size:20px;font-weight:600}
.back{width:44px;height:44px;display:flex;align-items:center;justify-content:center}
.body{padding:16px 20px;display:flex;flex-direction:column;gap:16px}
.row{display:flex;gap:8px;align-items:center;font-size:16px}
.stack{display:flex;flex-direction:column;gap:8px}
.small{font-size:14px;color:var(--muted);line-height:1.4}
.plan{min-height:56px;display:flex;align-items:center;padding:0 16px;border-radius:12px;border:1px solid var(--border);background:var(--card);font-size:16px;font-weight:600}
.plan.on{border-color:var(--primary);background:var(--soft)}
.btn{height:52px;border-radius:12px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px}
.ghost{height:52px;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:16px}
.links{display:flex;justify-content:center;gap:24px}
.links span{font-size:12px;font-weight:500;color:var(--link);text-decoration:underline}
.plans{display:flex;flex-direction:column;gap:12px}
</style><body>
<div class="status"><span>9:41</span><span>􀙇</span></div>
<div class="head"><div class="back"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg></div><h1>Medicron Plus</h1></div>
<div class="body">
  <div class="stack">${benefit("Pacientes ilimitados")}${benefit("Até 8 pessoas na conta")}${benefit("Histórico completo")}</div>
  <div class="small">Continuam grátis: lembretes, a tela Hoje, marcar doses e widgets.</div>
  <div class="plans">
    ${plan("R$&nbsp;89,90 por ano", true)}${plan("R$&nbsp;12,90 por mês", false)}
    <div class="btn">Começar 7 dias grátis</div>
    <div class="small">7 dias grátis, depois R$&nbsp;89,90/ano. Cancele quando quiser nos Ajustes da App Store.</div>
    <div class="small">A cobrança acontece em DATA, se você não cancelar antes.</div>
  </div>
  <div class="ghost">Restaurar compras</div>
  <div class="links"><span>Termos de uso</span><span>Política de privacidade</span></div>
</div></body></html>`.replace("DATA", new Date(Date.now() + 7 * 86_400_000).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }));

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "medicron-review-"));
try {
  const file = path.join(tmp, "plus.html"), shot = path.join(tmp, "plus.png");
  fs.writeFileSync(file, html);
  const r = await runChrome(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${W},${H}`, `--force-device-scale-factor=${SCALE}`, "--virtual-time-budget=3000", `--screenshot=${shot}`, `file://${file}`]);
  if (r.code !== 0 || !fs.existsSync(shot)) throw new Error(`Chrome falhou: ${r.stderr.slice(-200)}`);
  fs.mkdirSync(outDir, { recursive: true });
  const out = path.join(outDir, "review-plus-1242x2688.png");
  const info = await sharp(shot).resize(W * SCALE, H * SCALE, { fit: "cover", position: "top" }).flatten({ background: "#ffffff" }).removeAlpha().png({ compressionLevel: 9 }).toFile(out);
  console.log(`${path.relative(path.resolve(import.meta.dirname, "../../.."), out)}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(0)} KB`);
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}
