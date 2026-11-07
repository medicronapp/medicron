import { describe, expect, test } from "vitest";
import { config } from "../vercel";

describe("vercel.ts", () => {
  test("medicron.vercel.app redireciona para o domínio de produção, preservando o caminho", () => {
    const rule = config.redirects?.find((r) => r.has?.some((c) => c.type === "host" && c.value === "medicron.vercel.app"));
    expect(rule).toBeDefined();
    expect(rule).toMatchObject({ source: "/:path*", destination: "https://medicron.com.br/:path*", permanent: true });
  });

  test("só o host exato é redirecionado (previews de deploy continuam funcionando)", () => {
    const hosts = (config.redirects ?? []).flatMap((r) => r.has ?? []).filter((c) => c.type === "host").map((c) => c.value);
    expect(hosts).toEqual(["medicron.vercel.app"]);
  });
});
