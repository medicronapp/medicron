import { describe, expect, test } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { member, organization, orgSubscriptions, session, user } from "@/lib/db/schema";
import { grantPlusByEmail, parseGrantArgs } from "@/lib/services/grant-plus";
import { getSubscription } from "@/lib/services/subscription";

const NOW = new Date("2026-11-10T15:00:00.000Z");

describe("parseGrantArgs", () => {
  test("--email e --until (AAAA-MM-DD) válidos: a validade é o fim do dia em Brasília", () => {
    const r = parseGrantArgs(["--email", "Ana@Teste.com", "--until", "2027-12-31"], NOW);
    expect(r.email).toBe("ana@teste.com");
    expect(r.until.toISOString()).toBe("2028-01-01T02:59:59.999Z"); // 23:59:59.999 em UTC-3
  });
  test("sem --email ou sem --until: erro claro com o modo de usar", () => {
    expect(() => parseGrantArgs(["--until", "2027-01-01"], NOW)).toThrow(/--email/);
    expect(() => parseGrantArgs(["--email", "a@b.com"], NOW)).toThrow(/--until/);
  });
  test("data inválida ou no passado: erro", () => {
    expect(() => parseGrantArgs(["--email", "a@b.com", "--until", "31/12/2027"], NOW)).toThrow(/AAAA-MM-DD/);
    expect(() => parseGrantArgs(["--email", "a@b.com", "--until", "2027-02-31"], NOW)).toThrow(/inválida/);
    expect(() => parseGrantArgs(["--email", "a@b.com", "--until", "2026-11-09"], NOW)).toThrow(/passado/);
  });
});

describe("grantPlusByEmail", () => {
  async function base() {
    const db = await createTestDb();
    await db.insert(user).values([{ id: "u1", name: "Ana", email: "ana@teste.com" }, { id: "u2", name: "Bia", email: "bia@teste.com" }]);
    await db.insert(organization).values([
      { id: "o1", name: "Casa A", slug: "a", createdAt: new Date("2026-01-01") },
      { id: "o2", name: "Casa B", slug: "b", createdAt: new Date("2026-02-01") },
    ]);
    return db;
  }
  const until = new Date("2027-12-31T02:59:59.999Z");

  test("e-mail inexistente ou usuário sem conta: erro", async () => {
    const db = await base();
    await expect(grantPlusByEmail(db, "nao@existe.com", until)).rejects.toThrow(/não encontrado/);
    await expect(grantPlusByEmail(db, "bia@teste.com", until)).rejects.toThrow(/nenhuma conta/);
  });

  test("usuário com uma conta: concede Plus manual até o fim do dia e a conta fica Plus", async () => {
    const db = await base();
    await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
    expect(await grantPlusByEmail(db, "ana@teste.com", until)).toEqual({ orgId: "o1" });
    const s = await getSubscription(db, "o1", NOW);
    expect(s).toMatchObject({ tier: "plus", source: "manual", plusUntil: until.toISOString() });
  });

  test("com várias contas usa a ATIVA da sessão; sem sessão, a primeira em que entrou", async () => {
    const db = await base();
    await db.insert(member).values([
      { id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date("2026-01-01") },
      { id: "m2", organizationId: "o2", userId: "u1", role: "member", createdAt: new Date("2026-02-01") },
    ]);
    expect((await grantPlusByEmail(db, "ana@teste.com", until)).orgId).toBe("o1");
    await db.insert(session).values({ id: "s1", userId: "u1", token: "t", expiresAt: new Date("2030-01-01"), createdAt: new Date(), updatedAt: new Date(), activeOrganizationId: "o2" });
    expect((await grantPlusByEmail(db, "ana@teste.com", until)).orgId).toBe("o2");
  });

  test("reaplicar não duplica (uma linha por conta) e atualiza a validade", async () => {
    const db = await base();
    await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
    await grantPlusByEmail(db, "ana@teste.com", until);
    await grantPlusByEmail(db, "ana@teste.com", new Date("2028-12-31T02:59:59.999Z"));
    const rows = await db.select().from(orgSubscriptions);
    expect(rows).toHaveLength(1);
    expect(rows[0].plusUntil?.toISOString()).toBe("2028-12-31T02:59:59.999Z");
  });
});
