import { describe, expect, test } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "@/proxy";

// O matcher do Next é uma expressão regular de caminho: ela decide em quais rotas o `proxy` roda.
const runsOn = (path: string) => new RegExp(`^${config.matcher[0]}$`).test(path);

describe("proxy: rotas públicas", () => {
  test.each(["/privacidade", "/.well-known/apple-app-site-association", "/.well-known/assetlinks.json", "/entrar", "/cadastrar", "/convite/abc"])(
    "%s não passa pelo proxy (não exige login)", (path) => {
      expect(runsOn(path)).toBe(false);
    },
  );
  test.each(["/", "/pacientes", "/itens/abc", "/conta"])("%s continua protegida", (path) => {
    expect(runsOn(path)).toBe(true);
  });
  test("sem cookie de sessão, uma rota protegida redireciona para entrar guardando o destino", () => {
    const res = proxy(new NextRequest("https://medicron.com.br/pacientes"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://medicron.com.br/entrar?next=%2Fpacientes");
  });
});
