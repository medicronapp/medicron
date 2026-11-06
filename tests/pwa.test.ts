import { test, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));

test("manifest tem identidade e modo standalone", () => {
  expect(manifest.name).toBe("Medicron");
  expect(manifest.display).toBe("standalone");
  expect(manifest.theme_color).toBe("#0d9488");
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
});

test("todos os ícones do manifest existem em disco e há 192, 512 e um maskable", () => {
  const sizes = manifest.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
  expect(manifest.icons.some((i: { purpose?: string }) => i.purpose?.includes("maskable"))).toBe(true);
  for (const icon of manifest.icons) expect(existsSync(`public${icon.src}`), icon.src).toBe(true);
  expect(existsSync("public/icons/apple-touch-icon.png")).toBe(true);
});

test("manifest tem atalhos para Hoje e Gatos", () => {
  expect(manifest.shortcuts.map((s: { url: string }) => s.url)).toEqual(["/", "/pacientes"]);
  expect(manifest.categories).toContain("health");
});
