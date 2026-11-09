import { describe, expect, test } from "vitest";
import { eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { createAuth } from "@/lib/auth";
import { member, organization, patients, session, user } from "@/lib/db/schema";
import { createPatient } from "@/lib/services/patients";

const cfg = { secret: "x".repeat(32), baseURL: "http://localhost:3000", withNextCookies: false };
const PASSWORD = "Teste-9876-ok";

async function setup() {
  const db = await createTestDb();
  const auth = createAuth(db, cfg);
  const post = (path: string, body: unknown, cookie?: string) =>
    auth.handler(new Request(`http://localhost:3000/api/auth${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: "medicron://", ...(cookie ? { cookie } : {}) },
      body: JSON.stringify(body),
    }));
  const signUp = async (email: string, name: string) => {
    const res = await post("/sign-up/email", { email, password: PASSWORD, name });
    const setCookie = res.headers.get("set-cookie") ?? "";
    const cookie = setCookie.split(",").map((c) => c.split(";")[0].trim()).filter((c) => c.includes("session_token")).join("; ");
    const body = (await res.json()) as { user: { id: string } };
    return { id: body.user.id, cookie };
  };
  const org = async (cookie: string, name: string, slug: string) => {
    const res = await post("/organization/create", { name, slug }, cookie);
    return ((await res.json()) as { id: string }).id;
  };
  return { db, post, signUp, org };
}

describe("delete-user: exclusão de conta com senha", () => {
  test("senha errada: erro e NADA é apagado", async () => {
    const { db, post, signUp, org } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const orgId = await org(ana.cookie, "Casa de Ana", "casa-ana");
    await createPatient(db, orgId, { name: "Izzy", species: "cat" });
    const res = await post("/delete-user", { password: "senha-errada-123" }, ana.cookie);
    expect(res.status).toBe(400);
    expect(await db.select().from(user).where(eq(user.id, ana.id))).toHaveLength(1);
    expect(await db.select().from(organization).where(eq(organization.id, orgId))).toHaveLength(1);
    expect(await db.select().from(patients)).toHaveLength(1);
  });

  test("sem senha NÃO exclui, mesmo com a sessão recém-criada (a senha é obrigatória)", async () => {
    const { db, post, signUp, org } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const orgId = await org(ana.cookie, "Casa de Ana", "casa-ana");
    await createPatient(db, orgId, { name: "Izzy", species: "cat" });
    const res = await post("/delete-user", {}, ana.cookie);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { message: string }).message).toBe("Informe a senha para excluir a conta.");
    expect(await db.select().from(user).where(eq(user.id, ana.id))).toHaveLength(1);
    expect(await db.select().from(patients)).toHaveLength(1);
  });

  test("senha certa: apaga o usuário, as sessões e, sendo a única pessoa, a conta e os dados dela", async () => {
    const { db, post, signUp, org } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const orgId = await org(ana.cookie, "Casa de Ana", "casa-ana");
    await createPatient(db, orgId, { name: "Izzy", species: "cat" });
    const res = await post("/delete-user", { password: PASSWORD }, ana.cookie);
    expect(res.status).toBe(200);
    expect(await db.select().from(user).where(eq(user.id, ana.id))).toHaveLength(0);
    expect(await db.select().from(session).where(eq(session.userId, ana.id))).toHaveLength(0);
    expect(await db.select().from(organization).where(eq(organization.id, orgId))).toHaveLength(0);
    expect(await db.select().from(patients)).toHaveLength(0);
  });

  test("conta compartilhada: o usuário sai, a conta e os dados ficam e o outro vira dono", async () => {
    const { db, post, signUp, org } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const bia = await signUp("bia@teste.local", "Bia");
    const orgId = await org(ana.cookie, "Casa compartilhada", "casa-comp");
    await db.insert(member).values({ id: "m-bia", organizationId: orgId, userId: bia.id, role: "member", createdAt: new Date() });
    await createPatient(db, orgId, { name: "Izzy", species: "cat" });
    const res = await post("/delete-user", { password: PASSWORD }, ana.cookie);
    expect(res.status).toBe(200);
    expect(await db.select().from(user).where(eq(user.id, ana.id))).toHaveLength(0);
    expect(await db.select().from(organization).where(eq(organization.id, orgId))).toHaveLength(1);
    expect(await db.select().from(patients)).toHaveLength(1);
    const members = await db.select().from(member).where(eq(member.organizationId, orgId));
    expect(members.map((m) => [m.userId, m.role])).toEqual([[bia.id, "owner"]]);
    expect(await db.select().from(user).where(eq(user.id, bia.id))).toHaveLength(1);
  });

  test("sem sessão: 401 e nada acontece", async () => {
    const { db, post, signUp } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const res = await post("/delete-user", { password: PASSWORD });
    expect(res.status).toBe(401);
    expect(await db.select().from(user).where(eq(user.id, ana.id))).toHaveLength(1);
  });
});
