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
