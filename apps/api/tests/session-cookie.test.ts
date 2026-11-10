import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { getCookies } from "better-auth/cookies";
import { createTestDb } from "@/lib/db/test-db";
import { createAuth } from "@/lib/auth";

// O roteamento do site (apps/app/vercel.json) decide hotsite ou app pelo NOME do cookie de sessão. Se o better-auth
// mudar o nome (ou o prefixo), quem está logado passaria a ver o hotsite: este teste trava isso.
const appDir = path.resolve(__dirname, "../../app");

describe("cookie de sessão usado pelo roteamento do hotsite", () => {
  test("é o nome que o better-auth gera de verdade em produção (https)", async () => {
    const auth = createAuth(await createTestDb(), { secret: "x".repeat(32), baseURL: "https://medicron.com.br", withNextCookies: false });
    const name = getCookies(auth.options).sessionToken.name;
    expect(name).toBe("__Secure-better-auth.session_token");
    const constant = fs.readFileSync(path.join(appDir, "scripts/vercel-config.ts"), "utf8").match(/SESSION_COOKIE = "([^"]+)"/)![1];
    expect(constant).toBe(name);
  });
  test("o vercel.json do site usa esse nome na regra da raiz", () => {
    const json = JSON.parse(fs.readFileSync(path.join(appDir, "vercel.json"), "utf8"));
    const rule = json.rewrites.find((r: { source: string; has?: { type: string }[] }) => r.source === "/" && r.has?.some((h) => h.type === "cookie"));
    expect(rule.has[0]).toMatchObject({ type: "cookie", key: "__Secure-better-auth.session_token" });
  });
});
