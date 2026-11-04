import { describe, test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { carePlans, items } from "@/lib/db/schema";
import { createCat, listCats, getCat, updateCat, archiveCat } from "@/lib/services/cats";

describe("cats", () => {
  test("cria e lista por organização, ordenado por nome", async () => {
    const db = await createTestDb();
    await createCat(db, "o1", { name: "Zeca" });
    await createCat(db, "o1", { name: "Alfa" });
    await createCat(db, "o2", { name: "Outro" });
    expect((await listCats(db, "o1")).map((c) => c.name)).toEqual(["Alfa", "Zeca"]);
  });

  test("getCat de outra organização devolve null", async () => {
    const db = await createTestDb();
    const cat = await createCat(db, "o1", { name: "Mimi" });
    expect(await getCat(db, "o2", cat.id)).toBeNull();
    expect((await getCat(db, "o1", cat.id))?.name).toBe("Mimi");
  });

  test("updateCat de outra organização devolve null e não altera", async () => {
    const db = await createTestDb();
    const cat = await createCat(db, "o1", { name: "Mimi" });
    expect(await updateCat(db, "o2", cat.id, { name: "Hack" })).toBeNull();
    expect((await updateCat(db, "o1", cat.id, { name: "Nina", weightKg: 4.2 }))?.name).toBe("Nina");
  });

  test("nome vazio é rejeitado", async () => {
    const db = await createTestDb();
    await expect(createCat(db, "o1", { name: "   " })).rejects.toThrow();
  });

  test("archiveCat some da lista e desativa os planos do gato", async () => {
    const db = await createTestDb();
    const cat = await createCat(db, "o1", { name: "Mimi" });
    const [item] = await db.insert(items).values({ organizationId: "o1", name: "X", kind: "medication" }).returning();
    const at = new Date();
    const [plan] = await db.insert(carePlans).values({
      organizationId: "o1", catId: cat.id, itemId: item.id, intervalMinutes: 60, anchorAt: at, nextDueAt: at,
    }).returning();
    await archiveCat(db, "o1", cat.id);
    expect(await listCats(db, "o1")).toEqual([]);
    const [after] = await db.select().from(carePlans);
    expect(after.id).toBe(plan.id);
    expect(after.active).toBe(false);
  });

  test("archiveCat de outra organização não afeta o gato", async () => {
    const db = await createTestDb();
    const cat = await createCat(db, "o1", { name: "Mimi" });
    await archiveCat(db, "o2", cat.id);
    expect(await listCats(db, "o1")).toHaveLength(1);
  });
});
