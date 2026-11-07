import { describe, expect, test } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { createAuth } from "@/lib/auth";

const base = { secret: "x".repeat(32), baseURL: "http://localhost:3000", withNextCookies: false };

describe("createAuth: login para o app nativo", () => {
  test("inclui o plugin do Expo e as origens confiáveis do app e do domínio", async () => {
    const auth = createAuth(await createTestDb(), base);
    expect(auth.options.plugins?.some((p) => p.id === "expo")).toBe(true);
    expect(auth.options.trustedOrigins).toEqual(expect.arrayContaining([
      "medicron://", "medicron://*", "https://medicron.com.br", "https://www.medicron.com.br",
    ]));
  });

  test("origens extras (exp:// de desenvolvimento) entram na lista", async () => {
    const auth = createAuth(await createTestDb(), { ...base, extraTrustedOrigins: ["exp://192.168.0.5:8081"] });
    expect(auth.options.trustedOrigins).toContain("exp://192.168.0.5:8081");
  });

  test("criar conta com origem medicron:// funciona e devolve o cookie de sessão", async () => {
    const auth = createAuth(await createTestDb(), base);
    const res = await auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
      method: "POST",
      headers: { "content-type": "application/json", origin: "medicron://" },
      body: JSON.stringify({ email: "ana@teste.local", password: "Teste-9876-ok", name: "Ana" }),
    }));
    expect(res.status).toBe(200);
    expect(res.headers.get("set-cookie") ?? "").toContain("session_token");
  });
});
