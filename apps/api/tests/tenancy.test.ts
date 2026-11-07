import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { user, organization, member } from "@/lib/db/schema";
import { assertMember, Forbidden } from "@/lib/tenancy";

async function seed() {
  const db = await createTestDb();
  await db.insert(user).values([
    { id: "u1", name: "Ana", email: "a@x.com" },
    { id: "u2", name: "Bia", email: "b@x.com" },
  ]);
  await db.insert(organization).values([
    { id: "o1", name: "Casa A", slug: "casa-a", createdAt: new Date() },
    { id: "o2", name: "Casa B", slug: "casa-b", createdAt: new Date() },
  ]);
  await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
  return db;
}

describe("assertMember", () => {
  test("membro da org passa e devolve o papel", async () => {
    const db = await seed();
    await expect(assertMember(db, "u1", "o1")).resolves.toBe("owner");
  });
  test("usuário de outra org lança Forbidden", async () => {
    const db = await seed();
    await expect(assertMember(db, "u2", "o1")).rejects.toBeInstanceOf(Forbidden);
    await expect(assertMember(db, "u1", "o2")).rejects.toBeInstanceOf(Forbidden);
  });
});

import { pickActiveOrg } from "@/lib/tenancy";

describe("pickActiveOrg", () => {
  test("mantém a conta ativa quando o usuário ainda é membro", () => {
    expect(pickActiveOrg("o2", ["o1", "o2"])).toBe("o2");
  });
  test("cai na primeira conta se a ativa não está mais na lista", () => {
    expect(pickActiveOrg("o9", ["o1", "o2"])).toBe("o1");
    expect(pickActiveOrg(null, ["o1"])).toBe("o1");
  });
  test("sem contas devolve null", () => {
    expect(pickActiveOrg("o9", [])).toBeNull();
  });
});
