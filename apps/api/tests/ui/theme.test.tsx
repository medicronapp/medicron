// @vitest-environment jsdom
import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

test("Button e Input têm altura de toque de 44px por padrão", () => {
  render(
    <ThemeProvider>
      <Button>Salvar</Button>
      <Input aria-label="Nome" />
    </ThemeProvider>,
  );
  expect(screen.getByRole("button", { name: "Salvar" }).className).toContain("h-11");
  expect(screen.getByLabelText("Nome").className).toContain("h-11");
});

test("tokens de marca e status existem em :root e .dark", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const root = css.slice(css.indexOf(":root {"), css.indexOf(".dark {"));
  const dark = css.slice(css.indexOf(".dark {"), css.indexOf("@layer base"));
  for (const token of ["--brand", "--success", "--success-soft", "--warning", "--warning-soft", "--info", "--info-soft"]) {
    expect(root, `${token} em :root`).toContain(`${token}:`);
    expect(dark, `${token} em .dark`).toContain(`${token}:`);
  }
});

test("a fonte sans aponta para a variável do Geist (não para si mesma)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const decl = css.match(/--font-sans:\s*([^;]+);/)?.[1] ?? "";
  expect(decl).toContain("--font-geist-sans");
  expect(decl).not.toMatch(/var\(--font-sans\)/);
});

test("grids não deixam texto longo estourar a coluna (minmax(0,1fr) na camada base)", () => {
  const css = readFileSync("src/app/globals.css", "utf8");
  const base = css.slice(css.indexOf("@layer base"));
  expect(base).toMatch(/\.grid\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)/);
});

test("botão primário mantém contraste AA no hover (hover:bg-primary/90, não /80)", () => {
  const src = readFileSync("src/components/ui/button.tsx", "utf8");
  expect(src).toContain("hover:bg-primary/90");
  expect(src).not.toContain("hover:bg-primary/80");
});

test("variante destrutiva usa tokens -soft/-ink (contraste AA), não vermelho sobre vermelho translúcido", () => {
  const src = readFileSync("src/components/ui/button.tsx", "utf8");
  const destructive = src.match(/destructive:\s*"([^"]+)"/)?.[1] ?? "";
  expect(destructive).toContain("bg-destructive-soft");
  expect(destructive).toContain("text-destructive-ink");
});
