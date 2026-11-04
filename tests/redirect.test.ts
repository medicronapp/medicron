import { test, expect } from "vitest";
import { safeNext } from "@/lib/redirect";

test("aceita caminhos internos", () => {
  expect(safeNext("/convite/abc")).toBe("/convite/abc");
  expect(safeNext("/gatos?x=1")).toBe("/gatos?x=1");
});

test("rejeita URLs externas, protocolo relativo e vazio", () => {
  for (const bad of ["https://evil.com", "//evil.com", "/\\evil.com", "evil.com", "", null]) {
    expect(safeNext(bad)).toBe("/");
  }
});
