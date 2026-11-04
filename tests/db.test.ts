import { test, expect } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { cats, items, carePlans, doseLogs } from "@/lib/db/schema";

test("insere gato, item, plano e log; log duplicado viola unique", async () => {
  const db = await createTestDb();
  const [cat] = await db.insert(cats).values({ organizationId: "o1", name: "Mimi" }).returning();
  const [item] = await db
    .insert(items)
    .values({ organizationId: "o1", name: "Amoxicilina", kind: "medication" })
    .returning();
  const at = new Date("2026-11-04T08:00:00Z");
  const [plan] = await db
    .insert(carePlans)
    .values({
      organizationId: "o1", catId: cat.id, itemId: item.id,
      intervalMinutes: 480, anchorAt: at, nextDueAt: at,
    })
    .returning();
  const log = { organizationId: "o1", carePlanId: plan.id, scheduledFor: at, outcome: "done" as const, doneByUserId: "u1" };
  await db.insert(doseLogs).values(log);
  await expect(db.insert(doseLogs).values(log)).rejects.toThrow();
});
