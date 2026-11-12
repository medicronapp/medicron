import { describe, expect, test } from "vitest";
import { and, eq } from "drizzle-orm";
import { createTestDb } from "@/lib/db/test-db";
import { createAuth } from "@/lib/auth";
import { invitation, member, user } from "@/lib/db/schema";
import { grantPlus } from "@/lib/services/subscription";

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
    return { id: body.user.id, cookie, email };
  };
  const org = async (cookie: string, name: string, slug: string) => ((await (await post("/organization/create", { name, slug }, cookie)).json()) as { id: string }).id;
  const invite = async (cookie: string, orgId: string, email: string) => {
    const res = await post("/organization/invite-member", { email, role: "member", organizationId: orgId }, cookie);
    return { status: res.status, body: (await res.json()) as { id?: string; code?: string; message?: string } };
  };
  const accept = async (cookie: string, invitationId: string) => {
    const res = await post("/organization/accept-invitation", { invitationId }, cookie);
    return { status: res.status, body: (await res.json()) as { code?: string; message?: string } };
  };
  const members = async (orgId: string) => (await db.select().from(member).where(eq(member.organizationId, orgId))).length;
  return { db, signUp, org, invite, accept, members };
}

describe("pessoas na conta: grátis 2, Plus 8", () => {
  test("grátis: com 1 pessoa, UM convite pendente passa e o segundo falha com INVITATION_LIMIT_REACHED", async () => {
    const { signUp, org, invite } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const orgId = await org(ana.cookie, "Casa", "casa");
    const a = await invite(ana.cookie, orgId, "bia@teste.local");
    expect(a.status).toBe(200);
    const b = await invite(ana.cookie, orgId, "caio@teste.local");
    expect(b.status).toBe(403);
    expect(b.body.code).toBe("INVITATION_LIMIT_REACHED");
  });

  test("grátis: aceitar um convite com a conta já cheia (2 pessoas) falha com ORGANIZATION_MEMBERSHIP_LIMIT_REACHED e não entra ninguém", async () => {
    const { db, signUp, org, accept, members } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const bia = await signUp("bia@teste.local", "Bia");
    const caio = await signUp("caio@teste.local", "Caio");
    const orgId = await org(ana.cookie, "Casa", "casa");
    await db.insert(member).values({ id: "mb", organizationId: orgId, userId: bia.id, role: "member", createdAt: new Date() });
    await db.insert(invitation).values({ id: "inv1", organizationId: orgId, email: caio.email, role: "member", status: "pending", expiresAt: new Date(Date.now() + 86_400_000), createdAt: new Date(), inviterId: ana.id });
    const r = await accept(caio.cookie, "inv1");
    expect(r.status).toBe(403);
    expect(r.body.code).toBe("ORGANIZATION_MEMBERSHIP_LIMIT_REACHED");
    expect(await members(orgId)).toBe(2);
  });

  test("Plus: a conta aceita mais gente (até 8): o 3º membro entra", async () => {
    const { db, signUp, org, accept, members } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const bia = await signUp("bia@teste.local", "Bia");
    const caio = await signUp("caio@teste.local", "Caio");
    const orgId = await org(ana.cookie, "Casa", "casa");
    await grantPlus(db, orgId, new Date(Date.now() + 86_400_000), "manual");
    await db.insert(member).values({ id: "mb", organizationId: orgId, userId: bia.id, role: "member", createdAt: new Date() });
    await db.insert(invitation).values({ id: "inv1", organizationId: orgId, email: caio.email, role: "member", status: "pending", expiresAt: new Date(Date.now() + 86_400_000), createdAt: new Date(), inviterId: ana.id });
    expect((await accept(caio.cookie, "inv1")).status).toBe(200);
    expect(await members(orgId)).toBe(3);
  });

  test("Plus: convida vários de uma vez (cabem 8 − membros pendentes)", async () => {
    const { db, signUp, org, invite } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const orgId = await org(ana.cookie, "Casa", "casa");
    await grantPlus(db, orgId, new Date(Date.now() + 86_400_000), "manual");
    for (const e of ["b", "c", "d"]) expect((await invite(ana.cookie, orgId, `${e}@teste.local`)).status).toBe(200);
  });

  test("REGRA DE OURO: conta que ficou acima do limite (cancelou o Plus) NÃO perde ninguém", async () => {
    const { db, signUp, org, invite, members } = await setup();
    const ana = await signUp("ana@teste.local", "Ana");
    const orgId = await org(ana.cookie, "Casa", "casa");
    const outros = await db.insert(user).values([
      { id: "u9", name: "Z1", email: "z1@x.com" }, { id: "u10", name: "Z2", email: "z2@x.com" }, { id: "u11", name: "Z3", email: "z3@x.com" },
    ]).returning();
    await db.insert(member).values(outros.map((u, i) => ({ id: `mz${i}`, organizationId: orgId, userId: u.id, role: "member", createdAt: new Date() })));
    expect(await members(orgId)).toBe(4); // 4 pessoas no grátis (limite 2), vindas de quando era Plus
    expect((await invite(ana.cookie, orgId, "novo@teste.local")).status).toBe(403); // só não cria novos convites
    expect(await members(orgId)).toBe(4);
    expect(await db.select().from(member).where(and(eq(member.organizationId, orgId), eq(member.userId, ana.id)))).toHaveLength(1);
  });
});
