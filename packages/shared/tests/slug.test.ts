import { describe, expect, test } from "vitest";
import { orgSlug } from "../src/slug";

describe("orgSlug", () => {
  test("tira acentos, minúsculas e hífens, com sufixo aleatório", () => {
    expect(orgSlug("Casa da Vovó")).toMatch(/^casa-da-vovo-[a-z0-9]{1,6}$/);
  });
  test("nome só com símbolos vira 'conta-…'", () => {
    expect(orgSlug("!!!")).toMatch(/^conta-[a-z0-9]{1,6}$/);
  });
  test("dois nomes iguais geram slugs diferentes", () => {
    expect(orgSlug("Casa")).not.toBe(orgSlug("Casa"));
  });
});
