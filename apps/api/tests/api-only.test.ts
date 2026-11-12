import { existsSync, readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

test("src/app só tem a API, a política, os termos de uso e os arquivos de links universais", () => {
  const dirs = readdirSync("src/app", { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).sort();
  expect(dirs).toEqual([".well-known", "api", "privacidade", "termos"]);
});

test("a web agora é o app Expo: o Next não serve mais manifest, service worker nem ícones", () => {
  for (const f of ["sw.js", "manifest.webmanifest", "icons"]) expect(existsSync(`public/${f}`), f).toBe(false);
  expect(existsSync("src/proxy.ts")).toBe(false);
  expect(existsSync("src/components")).toBe(false);
});

test("o layout não declara PWA nem tema (nada além da política usa)", () => {
  const layout = readFileSync("src/app/layout.tsx", "utf8");
  expect(layout).not.toMatch(/manifest|ThemeProvider|appleWebApp/);
});

test("o Next não redireciona mais /gatos (agora no vercel.json da web)", async () => {
  const cfg = (await import("../next.config")).default;
  expect(cfg.redirects).toBeUndefined();
});
