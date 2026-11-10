import fs from "node:fs";
import path from "node:path";
import { buildVercelConfig, SESSION_COOKIE, type Rewrite } from "../scripts/vercel-config";

const API = "https://medicron.vercel.app";
const cfg = buildVercelConfig(API);

// Limitação: não é o path-to-regexp da Vercel. Só cobre `:nome*`, grupos `(...)` e literais; ao usar `:param` simples, valide no preview.
// Casamento mínimo dos `source` do vercel.json: `:nome*` = qualquer sufixo; um grupo `(...)` é regex; o resto é literal.
const toRegExp = (source: string) =>
  source.startsWith("/(")
    ? new RegExp("^" + source + "$")
    : new RegExp("^" + source.replace(/[.]/g, "\\.").replace(/:[a-z]+\*/g, ".*") + "$");
type Req = { cookies?: Record<string, string>; query?: Record<string, string> };
type Has = { type: "cookie" | "query"; key: string; value?: string };
/** Primeira reescritura que casa com o caminho e cujas condições `has` (cookie/query) valem. */
const resolve = (p: string, req: Req = {}) =>
  cfg.rewrites.find((r: Rewrite & { has?: Has[] }) => toRegExp(r.source).test(p) && (r.has ?? []).every((h) =>
    h.type === "cookie" ? (req.cookies ?? {})[h.key] !== undefined && (h.value === undefined || (req.cookies ?? {})[h.key] === h.value)
    : (req.query ?? {})[h.key] !== undefined && (h.value === undefined || (req.query ?? {})[h.key] === h.value)))?.destination;
const firstRewrite = (p: string) => (resolve(p) ? { destination: resolve(p)! } : undefined);

test("o vercel.json do disco é o gerado para a API de produção", () => {
  const disk = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "vercel.json"), "utf8"));
  expect(disk).toEqual(JSON.parse(JSON.stringify(cfg)));
});

test("build estático do Expo: gera o hotsite, exporta o app e renomeia o index.html", () => {
  expect(cfg.buildCommand).toBe("node scripts/build-site.cli.ts && npx expo export -p web && node scripts/finalize-web.cli.ts");
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
test("/termos (termos de uso da assinatura) é servida pela API, antes do fallback do app", () => {
  expect(firstRewrite("/termos")?.destination).toBe(`${API}/termos`);
});
test.each(["/pacientes", "/pacientes/abc/editar", "/convite/xyz", "/conta", "/entrar", "/cadastrar"])("%s cai no app (app.html)", (p) => {
  expect(firstRewrite(p)?.destination).toBe("/app.html");
});
test.each(["/sw.js", "/manifest.webmanifest", "/icons/icon-192.png", "/_expo/static/js/web/x.js", "/favicon.ico", "/landing/fonts/geist-400.woff2", "/landing/og.png", "/robots.txt", "/sitemap.xml"])(
  "%s é arquivo: não cai no fallback", (p) => {
    expect(firstRewrite(p)).toBeUndefined();
  },
);

test("o fallback do app é a última reescrita e a API tem prioridade", () => {
  expect(cfg.rewrites[cfg.rewrites.length - 1].destination).toBe("/app.html");
  expect(cfg.rewrites.slice(0, 4).every((r) => r.destination.startsWith(API))).toBe(true);
});

describe("a raiz decide entre o hotsite e o app", () => {
  test("ordem: API, PWA, cookie de sessão, hotsite, fallback do app", () => {
    expect(cfg.rewrites.map((r) => r.destination)).toEqual([
      `${API}/api/:path*`, `${API}/privacidade`, `${API}/termos`, `${API}/.well-known/:path*`, "/app.html", "/app.html", "/landing/index.html", "/app.html",
    ]);
  });
  test("o cookie de sessão é o do better-auth em produção", () => {
    expect(SESSION_COOKIE).toBe("__Secure-better-auth.session_token");
  });
  test("com sessão: o app", () => {
    expect(resolve("/", { cookies: { [SESSION_COOKIE]: "abc" } })).toBe("/app.html");
  });
  test("sem sessão: o hotsite", () => {
    expect(resolve("/")).toBe("/landing/index.html");
    expect(resolve("/", { cookies: { outro: "x" } })).toBe("/landing/index.html");
  });
  test("PWA instalado (?source=pwa) vai sempre ao app, mesmo sem sessão (cai na tela de entrada)", () => {
    expect(resolve("/", { query: { source: "pwa" } })).toBe("/app.html");
    expect(resolve("/", { query: { source: "outra" } })).toBe("/landing/index.html");
  });
  test("os demais caminhos do app não dependem de sessão", () => {
    for (const p of ["/entrar", "/cadastrar", "/convite/x", "/pacientes", "/conta"]) expect(resolve(p)).toBe("/app.html");
  });
  test("/index.html e /landing(/) redirecionam para a raiz (o app é app.html; o hotsite só existe em /)", () => {
    expect(cfg.redirects).toEqual(expect.arrayContaining([
      { source: "/index.html", destination: "/", permanent: true },
      { source: "/landing", destination: "/", permanent: true },
      { source: "/landing/", destination: "/", permanent: true },
    ]));
  });
});

test("fontes do hotsite com cache longo e imutável", () => {
  const h = cfg.headers.find((x) => x.source === "/landing/fonts/:file")!;
  expect(h.headers).toEqual(expect.arrayContaining([{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]));
});

test("o manifesto abre o app instalado em /?source=pwa (e o atalho Hoje também)", () => {
  const m = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "public/manifest.webmanifest"), "utf8"));
  expect(m.start_url).toBe("/?source=pwa");
  expect(m.shortcuts.find((x: { name: string }) => x.name === "Hoje").url).toBe("/?source=pwa");
});

test("/gatos continua redirecionando para /pacientes", () => {
  expect(cfg.redirects).toEqual(expect.arrayContaining([
    { source: "/gatos", destination: "/pacientes", permanent: true },
    { source: "/gatos/:path*", destination: "/pacientes/:path*", permanent: true },
  ]));
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
