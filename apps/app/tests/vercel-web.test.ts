import fs from "node:fs";
import path from "node:path";
import { buildVercelConfig } from "../scripts/vercel-config";

const API = "https://medicron.vercel.app";
const cfg = buildVercelConfig(API);

// Casamento mínimo dos `source` do vercel.json: `:nome*` = qualquer sufixo; um grupo `(...)` é regex; o resto é literal.
const toRegExp = (source: string) =>
  source.startsWith("/(")
    ? new RegExp("^" + source + "$")
    : new RegExp("^" + source.replace(/[.]/g, "\\.").replace(/:[a-z]+\*/g, ".*") + "$");
const firstRewrite = (p: string) => cfg.rewrites.find((r) => toRegExp(r.source).test(p));

test("o vercel.json do disco é o gerado para a API de produção", () => {
  const disk = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  expect(disk).toEqual(JSON.parse(JSON.stringify(cfg)));
});

test("build estático do Expo", () => {
  expect(cfg.buildCommand).toBe("npx expo export -p web");
  expect(cfg.outputDirectory).toBe("dist");
  expect(cfg.installCommand).toBe("cd ../.. && npm ci");
});

test.each(["/api/cron/dispatch", "/api/auth/get-session", "/api/v1/push/devices", "/api/push/subscribe"])(
  "%s vai para a API (mesmo caminho)", (p) => {
    expect(firstRewrite(p)?.destination).toBe(`${API}/api/:path*`);
  },
);
test.each(["/.well-known/assetlinks.json", "/.well-known/apple-app-site-association"])("%s é servida pela API", (p) => {
  expect(firstRewrite(p)?.destination).toBe(`${API}/.well-known/:path*`);
});
test("/privacidade é servida pela API", () => {
  expect(firstRewrite("/privacidade")?.destination).toBe(`${API}/privacidade`);
});
test.each(["/", "/pacientes", "/pacientes/abc/editar", "/convite/xyz", "/conta"])("%s cai no app (index.html)", (p) => {
  expect(firstRewrite(p)?.destination).toBe("/index.html");
});
test.each(["/sw.js", "/manifest.webmanifest", "/icons/icon-192.png", "/_expo/static/js/web/x.js", "/favicon.ico"])(
  "%s é arquivo: não cai no fallback", (p) => {
    expect(firstRewrite(p)).toBeUndefined();
  },
);

test("o fallback do app é a última reescrita (a API tem prioridade)", () => {
  expect(cfg.rewrites[cfg.rewrites.length - 1].destination).toBe("/index.html");
  expect(cfg.rewrites.slice(0, -1).every((r) => r.destination.startsWith(API))).toBe(true);
});

test("/gatos continua redirecionando para /pacientes", () => {
  expect(cfg.redirects).toEqual([
    { source: "/gatos", destination: "/pacientes", permanent: true },
    { source: "/gatos/:path*", destination: "/pacientes/:path*", permanent: true },
  ]);
});

test("o service worker não fica em cache e vale para o site todo", () => {
  const h = cfg.headers.find((x) => x.source === "/sw.js")!;
  expect(h.headers).toEqual(expect.arrayContaining([
    { key: "Cache-Control", value: "no-cache" },
    { key: "Service-Worker-Allowed", value: "/" },
  ]));
});

test("as respostas da API nunca são guardadas na CDN do site estático (dados de contas diferentes)", () => {
  const h = cfg.headers.find((x) => x.source === "/api/:path*")!;
  expect(h.headers).toEqual(expect.arrayContaining([{ key: "x-vercel-enable-rewrite-caching", value: "0" }]));
});
