import { describe, expect, test, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { createAuth } from "@/lib/auth";
import { session, verification } from "@/lib/db/schema";
import type { Mail } from "@/lib/email/send";

const PASSWORD = "Teste-9876-ok";
const NEW_PASSWORD = "Outra-5432-nova";

async function setup(sendEmail?: (m: Mail) => Promise<void>) {
  const db = await createTestDb();
  const sent: Mail[] = [];
  const mailer = sendEmail ?? (async (m: Mail) => { sent.push(m); });
  const auth = createAuth(db, { secret: "x".repeat(32), baseURL: "http://localhost:3000", withNextCookies: false, appUrl: "https://medicron.com.br", sendEmail: mailer });
  const post = (path: string, body: unknown, cookie?: string) =>
    auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "medicron://", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }));
  const cookieOf = (res: Response) =>
    (res.headers.get("set-cookie") ?? "").split(",").map((c) => c.split(";")[0].trim()).filter((c) => c.includes("session_token")).join("; ");
  const signUp = async (email: string) => cookieOf(await post("/sign-up/email", { email, password: PASSWORD, name: "Ana" }));
  const tokenOf = (m: Mail) => new URL(m.text.match(/https:\/\/\S+/)![0]).searchParams.get("token")!;
  return { db, post, signUp, sent, tokenOf, cookieOf };
}

describe("esqueci minha senha", () => {
  test("pedir a redefinição manda 1 e-mail para a conta, com o link da própria página do app", async () => {
    const { post, signUp, sent } = await setup();
    await signUp("ana@teste.local");
    const res = await post("/request-password-reset", { email: "ana@teste.local" });
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@teste.local");
    expect(sent[0].text).toMatch(/https:\/\/medicron\.com\.br\/redefinir-senha\?token=\S+/);
    expect(new URL(sent[0].text.match(/https:\/\/\S+/)![0]).pathname).toBe("/redefinir-senha");
  });

  test("com o link: a senha nova vale, a antiga não, e o link não serve de novo", async () => {
    const { post, signUp, sent, tokenOf } = await setup();
    await signUp("ana@teste.local");
    await post("/request-password-reset", { email: "ana@teste.local" });
    const token = tokenOf(sent[0]);
    expect((await post("/reset-password", { token, newPassword: NEW_PASSWORD })).status).toBe(200);
    expect((await post("/sign-in/email", { email: "ana@teste.local", password: NEW_PASSWORD })).status).toBe(200);
    expect((await post("/sign-in/email", { email: "ana@teste.local", password: PASSWORD })).status).toBe(401);
    expect((await post("/reset-password", { token, newPassword: "Terceira-1111-x" })).status).toBe(400);
  });

  test("senha curta demais é recusada e o link continua valendo", async () => {
    const { post, signUp, sent, tokenOf } = await setup();
    await signUp("ana@teste.local");
    await post("/request-password-reset", { email: "ana@teste.local" });
    const token = tokenOf(sent[0]);
    expect((await post("/reset-password", { token, newPassword: "curta" })).status).toBe(400);
    expect((await post("/reset-password", { token, newPassword: NEW_PASSWORD })).status).toBe(200);
  });

  test("token inventado é recusado", async () => {
    const { post, signUp } = await setup();
    await signUp("ana@teste.local");
    expect((await post("/reset-password", { token: "inventado", newPassword: NEW_PASSWORD })).status).toBe(400);
  });

  test("o link vale por cerca de 1 hora", async () => {
    const { db, post, signUp } = await setup();
    await signUp("ana@teste.local");
    await post("/request-password-reset", { email: "ana@teste.local" });
    const [row] = await db.select().from(verification);
    const minutes = (row.expiresAt.getTime() - Date.now()) / 60_000;
    expect(minutes).toBeGreaterThan(55);
    expect(minutes).toBeLessThanOrEqual(60.5);
  });

  test("link vencido é recusado", async () => {
    const { db, post, signUp, sent, tokenOf } = await setup();
    await signUp("ana@teste.local");
    await post("/request-password-reset", { email: "ana@teste.local" });
    await db.update(verification).set({ expiresAt: new Date(Date.now() - 1000) });
    expect((await post("/reset-password", { token: tokenOf(sent[0]), newPassword: NEW_PASSWORD })).status).toBe(400);
  });

  test("redefinir a senha encerra as sessões abertas (quem tinha a senha antiga sai)", async () => {
    const { db, post, signUp, sent, tokenOf } = await setup();
    await signUp("ana@teste.local");
    expect((await db.select().from(session)).length).toBe(1);
    await post("/request-password-reset", { email: "ana@teste.local" });
    await post("/reset-password", { token: tokenOf(sent[0]), newPassword: NEW_PASSWORD });
    expect((await db.select().from(session)).length).toBe(0);
  });

  test("e-mail sem conta: mesma resposta 200 e nenhum e-mail enviado (não revela quem tem conta)", async () => {
    const { post, sent } = await setup();
    const res = await post("/request-password-reset", { email: "ninguem@teste.local" });
    expect(res.status).toBe(200);
    expect(sent).toHaveLength(0);
  });

  test("se o envio do e-mail falha, a resposta continua 200 (um erro aqui revelaria que a conta existe)", async () => {
    const failing = vi.fn(async () => { throw new Error("Resend fora do ar"); });
    const { post, signUp } = await setup(failing);
    await signUp("ana@teste.local");
    const res = await post("/request-password-reset", { email: "ana@teste.local" });
    expect(res.status).toBe(200);
    expect(failing).toHaveBeenCalledTimes(1);
  });
});
