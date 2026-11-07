import { afterEach, describe, expect, test, vi } from "vitest";

/** `vercel.ts` lê DOMAIN_REDIRECT ao ser carregado (na build); cada teste recarrega o módulo. */
async function load(flag?: string) {
  vi.resetModules();
  if (flag === undefined) delete process.env.DOMAIN_REDIRECT;
  else process.env.DOMAIN_REDIRECT = flag;
  return (await import("../vercel")).config;
}
afterEach(() => { delete process.env.DOMAIN_REDIRECT; });

const rule = (c: Awaited<ReturnType<typeof load>>) =>
  c.redirects?.find((r) => r.has?.some((h) => h.type === "host" && h.value === "medicron.vercel.app"));

describe("vercel.ts: redirecionamento para medicron.com.br", () => {
  test("desligado por padrão: o deploy não manda ninguém para um domínio que pode ainda não responder", async () => {
    expect((await load()).redirects ?? []).toEqual([]);
    expect((await load("0")).redirects ?? []).toEqual([]);
  });

  test("ligado (DOMAIN_REDIRECT=1): redireciona o host antigo para o domínio de produção, preservando o caminho", async () => {
    expect(rule(await load("1"))).toMatchObject({ destination: "https://medicron.com.br/:path" });
  });

  test("temporário (307): navegadores não guardam para sempre e dá para desfazer", async () => {
    expect(rule(await load("1"))?.permanent).toBe(false);
  });

  test("o agendador dos lembretes (/api/cron) não é redirecionado, senão perde o Authorization", async () => {
    const m = rule(await load("1"))?.source.match(/^\/:path\((.*)\)$/);
    expect(m).not.toBeNull();
    const re = new RegExp(`^${m![1]}$`);
    expect(re.test("api/cron/dispatch")).toBe(false);
    for (const ok of ["", "entrar", "pacientes/abc", "api/v1/me", "api/auth/sign-in/email"]) {
      expect(re.test(ok), ok).toBe(true);
    }
  });

  test("só o host exato é redirecionado (previews de deploy continuam funcionando)", async () => {
    const hosts = ((await load("1")).redirects ?? []).flatMap((r) => r.has ?? []).filter((c) => c.type === "host").map((c) => c.value);
    expect(hosts).toEqual(["medicron.vercel.app"]);
  });
});
