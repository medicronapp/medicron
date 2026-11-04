import { test, expect } from "vitest";
import { initials } from "@/lib/format";

test("initials usa até duas letras maiúsculas", () => {
  expect(initials("Ana Paula")).toBe("AP");
  expect(initials("Ana Paula de Souza")).toBe("AP");
  expect(initials("mimi")).toBe("M");
  expect(initials("  ")).toBe("?");
  expect(initials("")).toBe("?");
});
