import { test, expect } from "vitest";
import { initials } from "@/lib/format";

test("initials usa até duas letras maiúsculas", () => {
  expect(initials("Ana Paula")).toBe("AP");
  expect(initials("Ana Paula de Souza")).toBe("AP");
  expect(initials("mimi")).toBe("M");
  expect(initials("  ")).toBe("?");
  expect(initials("")).toBe("?");
});

import { ageLabel, catTone } from "@/lib/format";

test("ageLabel descreve idade em meses e anos", () => {
  const now = new Date("2026-11-04T12:00:00Z");
  expect(ageLabel("2026-11-01", now)).toBe("menos de 1 mês");
  expect(ageLabel("2026-05-04", now)).toBe("6 meses");
  expect(ageLabel("2025-10-01", now)).toBe("1 ano");
  expect(ageLabel("2021-03-10", now)).toBe("5 anos");
});

test("catTone é estável e fica entre 0 e 5", () => {
  expect(catTone("Mimi")).toBe(catTone("Mimi"));
  for (const n of ["Mimi", "Izzy", "A", "Nome muito longo de gato 123"]) {
    const t = catTone(n);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(5);
  }
});
