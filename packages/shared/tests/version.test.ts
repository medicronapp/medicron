import { describe, expect, test } from "vitest";
import { compareVersions } from "../src/version";

describe("compareVersions", () => {
  test("iguais", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
    expect(compareVersions("1.2", "1.2.0")).toBe(0);
  });
  test("compara numericamente, não como texto", () => {
    expect(compareVersions("1.2.3", "1.10.0")).toBe(-1);
    expect(compareVersions("2.0.0", "1.9.9")).toBe(1);
  });
  test("formato inválido lança", () => {
    expect(() => compareVersions("abc", "1.0.0")).toThrow();
    expect(() => compareVersions("1.0.0", "1..0")).toThrow();
  });
});
