import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { finalizeWeb } from "../scripts/finalize-web";

const dist = (files: Record<string, string>) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "dist-"));
  for (const [f, c] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), c); }
  return dir;
};

test("renomeia o index.html do app para app.html (a raiz passa a ser decidida pela Vercel)", () => {
  const d = dist({ "index.html": "<div id=root>", "landing/index.html": "<h1>site", "_expo/x.js": "1" });
  finalizeWeb(d);
  expect(fs.existsSync(path.join(d, "index.html"))).toBe(false);
  expect(fs.readFileSync(path.join(d, "app.html"), "utf8")).toBe("<div id=root>");
  expect(fs.existsSync(path.join(d, "landing/index.html"))).toBe(true);
});

test("sem index.html (a exportação falhou): erro claro", () => {
  expect(() => finalizeWeb(dist({ "landing/index.html": "x" }))).toThrow(/index\.html/);
});

test("app.html já existe (rodou duas vezes): erro, para não sobrescrever em silêncio", () => {
  expect(() => finalizeWeb(dist({ "index.html": "a", "app.html": "b", "landing/index.html": "x" }))).toThrow(/app\.html/);
});

test("sem o hotsite gerado: erro (senão a raiz ficaria sem página para quem não está logado)", () => {
  expect(() => finalizeWeb(dist({ "index.html": "a" }))).toThrow(/landing/);
});
