import { describe, expect, test } from "vitest";
import { config } from "../vercel";

const rule = () => config.redirects?.find((r) => r.has?.some((c) => c.type === "host" && c.value === "medicron.vercel.app"));

describe("vercel.ts", () => {
  test("medicron.vercel.app redireciona para o domínio de produção, preservando o caminho", () => {
    expect(rule()).toMatchObject({ destination: "https://medicron.com.br/:path" });
  });

  test("redirecionamento temporário (307): navegadores não guardam para sempre e dá para desfazer", () => {
    expect(rule()?.permanent).toBe(false);
  });

  test("o agendador dos lembretes (/api/cron) não é redirecionado, senão perde o Authorization", () => {
    const m = rule()?.source.match(/^\/:path\((.*)\)$/);
    expect(m).not.toBeNull();
    const re = new RegExp(`^${m![1]}$`);
    expect(re.test("api/cron/dispatch")).toBe(false);
    for (const ok of ["", "entrar", "pacientes/abc", "api/v1/me", "api/auth/sign-in/email"]) {
      expect(re.test(ok), ok).toBe(true);
    }
  });

  test("só o host exato é redirecionado (previews de deploy continuam funcionando)", () => {
    const hosts = (config.redirects ?? []).flatMap((r) => r.has ?? []).filter((c) => c.type === "host").map((c) => c.value);
    expect(hosts).toEqual(["medicron.vercel.app"]);
  });
});
