// Gera as capturas de tela REAIS do app para o hotsite (site/hoje-*.webp: tela Hoje; site/familia-*.webp: tela Conta).
// Uso (dentro de apps/app, com o app já exportado em dist/ por `expo export -p web` + finalize-web):
//   npm run capture-site-shots
// Sobe um servidor local que serve o app web real com uma API simulada (scripts/demo-data.ts) e o relógio congelado,
// e usa o Google Chrome em modo headless para fotografar a tela Hoje em 390 pt de largura (2x), em claro e escuro.
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { demoFullOrg, demoHome, demoMe, demoOrgs, demoSession, freezeTimeScript } from "./demo-data.ts";

const appRoot = path.resolve(import.meta.dirname, "..");
const dist = path.join(appRoot, "dist");
const CHROME = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const WIDTH = 390, HEIGHT = 760, SCALE = 2;

if (!fs.existsSync(path.join(dist, "app.html"))) throw new Error("dist/app.html não existe: rode `npx expo export -p web && node scripts/finalize-web.cli.ts` antes");
if (!fs.existsSync(CHROME)) throw new Error(`Chrome não encontrado em ${CHROME} (defina CHROME_BIN)`);

const API: Record<string, unknown> = {
  "/api/auth/get-session": demoSession(),
  "/api/auth/organization/list": demoOrgs(),
  "/api/auth/organization/get-full-organization": demoFullOrg(),
  "/api/v1/me": demoMe(),
  "/api/v1/home": demoHome(),
  "/api/v1/config": { minAppVersion: "0.0.0" },
};
const TYPES: Record<string, string> = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };

let theme: "light" | "dark" = "light";
let screen = "/";
const missing = new Set<string>();

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (url.pathname.startsWith("/api/")) {
    const body = API[url.pathname];
    if (body === undefined) { missing.add(`${req.method} ${url.pathname}`); res.writeHead(404, { "content-type": "application/json" }); res.end("{}"); return; }
    res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(body)); return;
  }
  if (url.pathname === "/__frame") {
    res.writeHead(200, { "content-type": "text/html" });
    res.end(`<!doctype html><body style="margin:0;background:transparent"><iframe src="${screen}" style="width:${WIDTH}px;height:${HEIGHT}px;border:0;display:block"></iframe>`);
    return;
  }
  const file = path.join(dist, decodeURIComponent(url.pathname));
  if (file.startsWith(dist) && fs.existsSync(file) && fs.statSync(file).isFile()) {
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
    return;
  }
  const html = fs.readFileSync(path.join(dist, "app.html"), "utf8").replace("<head>", `<head><script>${freezeTimeScript(theme)}</script>`);
  res.writeHead(200, { "content-type": "text/html" });
  res.end(html);
});

/** Roda o Chrome sem bloquear o Node (o servidor local precisa responder enquanto ele carrega o app). */
function runChrome(args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(CHROME, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 90_000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, stderr }); });
  });
}

async function shoot(route: string, t: "light" | "dark", out: string) {
  theme = t;
  screen = route;
  const png = path.join(os.tmpdir(), `medicron-shot-${route.replace(/\W/g, "")}-${t}.png`);
  const port = (server.address() as { port: number }).port;
  const r = await runChrome([
    "--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${WIDTH},${HEIGHT}`, `--force-device-scale-factor=${SCALE}`,
    "--virtual-time-budget=15000", `--screenshot=${png}`, `http://localhost:${port}/__frame`,
  ]);
  if (r.code !== 0 || !fs.existsSync(png)) throw new Error(`Chrome falhou (código ${r.code}): ${r.stderr.slice(-300)}`);
  const info = await sharp(png).webp({ quality: 84 }).toFile(out);
  console.log(`${path.relative(appRoot, out)}: ${info.width}x${info.height}, ${(info.size / 1024).toFixed(1)} KB`);
  fs.rmSync(png);
}

server.listen(0, async () => {
  try {
    await shoot("/", "light", path.join(appRoot, "site/hoje-claro.webp"));
    await shoot("/", "dark", path.join(appRoot, "site/hoje-escuro.webp"));
    await shoot("/conta", "light", path.join(appRoot, "site/familia-claro.webp"));
    await shoot("/conta", "dark", path.join(appRoot, "site/familia-escuro.webp"));
    if (missing.size) console.warn("Requisições sem resposta simulada:", [...missing].join(", "));
  } finally {
    server.close();
  }
});
