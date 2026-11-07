import { GEIST_FONTS, fontFamilyFor } from "@/theme/fonts";

describe("fontFamilyFor", () => {
  test.each([
    ["text-sm font-semibold", "Geist_600SemiBold"],
    ["font-bold", "Geist_700Bold"],
    ["text-base font-medium text-foreground", "Geist_500Medium"],
    ["font-normal", "Geist_400Regular"],
    ["text-sm", "Geist_400Regular"],
    ["", "Geist_400Regular"],
  ])("%s -> %s", (classes, family) => expect(fontFamilyFor(classes)).toBe(family));

  test("o último peso informado vence (como o tailwind-merge faz)", () => {
    expect(fontFamilyFor("font-medium font-bold")).toBe("Geist_700Bold");
  });

  test("todas as famílias usadas estão registradas para carregar", () => {
    for (const f of ["Geist_400Regular", "Geist_500Medium", "Geist_600SemiBold", "Geist_700Bold"]) {
      expect(GEIST_FONTS).toHaveProperty(f);
    }
  });
});
