import { expect, test } from "vitest";
import { SPECIES, speciesLabel } from "@/lib/species";

test("tipos disponíveis, com rótulo em português", () => {
  expect(SPECIES.map((s) => s.value)).toEqual(["cat", "dog", "human", "other"]);
  expect(SPECIES.map((s) => s.label)).toEqual(["Gato", "Cachorro", "Pessoa", "Outro"]);
  expect(speciesLabel("dog")).toBe("Cachorro");
});
