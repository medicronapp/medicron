// Servidor local que serve o app web REAL (dist/) com uma API simulada (demo-data.ts) e o relógio congelado.
// Usado pelas capturas do hotsite (capture-site-shots) e da App Store (capture-store-shots).
import { spawn } from "node:child_process";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { demoFullOrg, demoHome, demoItems, demoMe, demoOrgs, demoPatients, demoPlans, demoSession, freezeTimeScript } from "./demo-data.ts";

const TYPES: Record<string, string> = { ".html": "text/html", ".js": "application/javascript", ".css": "text/css", ".png": "image/png", ".ico": "image/x-icon", ".json": "application/json", ".ttf": "font/ttf", ".woff2": "font/woff2", ".webmanifest": "application/manifest+json", ".svg": "image/svg+xml" };

/** Corpo simulado de uma rota da API, ou `undefined` quando não há resposta simulada. */
export function demoApi(pathname: string, search = ""): unknown {
  const fixed: Record<string, unknown> = {
    "/api/auth/get-session": demoSession(),
    "/api/auth/organization/list": demoOrgs(),
    "/api/auth/organization/get-full-organization": demoFullOrg(),
    "/api/v1/me": demoMe(),
    "/api/v1/home": demoHome(),
    "/api/v1/config": { minAppVersion: "0.0.0" },
    "/api/v1/patients": { patients: demoPatients() },
  };
  if (pathname in fixed) return fixed[pathname];
  if (pathname === "/api/v1/items") {
    const kind = new URLSearchParams(search).get("kind");
    return { items: demoItems().filter((i) => !kind || i.kind === kind) };
  }
  const plans = pathname.match(/^\/api\/v1\/patients\/([^/]+)\/plans$/);
  if (plans) return { plans: demoPlans(plans[1]) };
  const one = pathname.match(/^\/api\/v1\/patients\/([^/]+)$/);
  if (one) { const p = demoPatients().find((x) => x.id === one[1]); return p ? { patient: p } : undefined; }
  return undefined;
}

export type DemoServer = {
  port: number;
  missing: Set<string>;
  /** Fotografa `route` (largura × altura em pt, escala `scale`) no tema pedido e grava o PNG em `out`. */
  shoot: (o: { route: string; theme: "light" | "dark"; width: number; height: number; scale: number; out: string }) => Promise<void>;
  close: () => void;
};

/** Roda o Chrome sem bloquear o Node (o servidor local precisa responder enquanto ele carrega o app). */
export function runChrome(chrome: string, args: string[]): Promise<{ code: number | null; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(chrome, args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (d) => { stderr += d; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 90_000);
    child.on("close", (code) => { clearTimeout(timer); resolve({ code, stderr }); });
  });
}

export function startDemoServer(dist: string, chrome = process.env.CHROME_BIN ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"): Promise<DemoServer> {
  if (!fs.existsSync(path.join(dist, "app.html"))) throw new Error("dist/app.html não existe: rode `npx expo export -p web && node scripts/finalize-web.cli.ts` antes");
  if (!fs.existsSync(chrome)) throw new Error(`Chrome não encontrado em ${chrome} (defina CHROME_BIN)`);
  let theme: "light" | "dark" = "light";
  let screen = "/";
  let size = { width: 390, height: 760 };
  const missing = new Set<string>();
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    if (url.pathname.startsWith("/api/")) {
      const body = demoApi(url.pathname, url.search);
      if (body === undefined) { missing.add(`${req.method} ${url.pathname}`); res.writeHead(404, { "content-type": "application/json" }); res.end("{}"); return; }
      res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(body)); return;
    }
    if (url.pathname === "/__frame") {
      res.writeHead(200, { "content-type": "text/html" });
      res.end(`<!doctype html><body style="margin:0;background:transparent"><iframe src="${screen}" style="width:${size.width}px;height:${size.height}px;border:0;display:block"></iframe>`);
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
  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      resolve({
        port, missing, close: () => server.close(),
        shoot: async ({ route, theme: t, width, height, scale, out }) => {
          theme = t; screen = route; size = { width, height };
          const r = await runChrome(chrome, [
            "--headless=new", "--disable-gpu", "--hide-scrollbars", `--window-size=${width},${height}`, `--force-device-scale-factor=${scale}`,
            "--virtual-time-budget=15000", `--screenshot=${out}`, `http://localhost:${port}/__frame`,
          ]);
          if (r.code !== 0 || !fs.existsSync(out)) throw new Error(`Chrome falhou (código ${r.code}): ${r.stderr.slice(-300)}`);
        },
      });
    });
  });
}
