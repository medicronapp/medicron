import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { items, carePlans, type Item } from "@/lib/db/schema";

export const itemInput = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(80),
  kind: z.enum(["medication", "procedure"]),
  defaultDose: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type ItemInput = z.input<typeof itemInput>;

const toRow = (i: z.output<typeof itemInput>) => ({
  name: i.name,
  kind: i.kind,
  defaultDose: i.defaultDose || null,
  notes: i.notes || null,
});

export async function createItem(db: Db, orgId: string, input: ItemInput): Promise<Item> {
  const [row] = await db.insert(items).values({ organizationId: orgId, ...toRow(itemInput.parse(input)) }).returning();
  return row;
}

export function listItems(db: Db, orgId: string, kind?: Item["kind"]): Promise<Item[]> {
  return db.select().from(items)
    .where(and(eq(items.organizationId, orgId), isNull(items.archivedAt), kind ? eq(items.kind, kind) : undefined))
    .orderBy(asc(items.name));
}

export async function getItem(db: Db, orgId: string, id: string): Promise<Item | null> {
  const [row] = await db.select().from(items)
    .where(and(eq(items.id, id), eq(items.organizationId, orgId), isNull(items.archivedAt))).limit(1);
  return row ?? null;
}

export async function updateItem(db: Db, orgId: string, id: string, input: ItemInput): Promise<Item | null> {
  const [row] = await db.update(items).set(toRow(itemInput.parse(input)))
    .where(and(eq(items.id, id), eq(items.organizationId, orgId), isNull(items.archivedAt))).returning();
  return row ?? null;
}

export async function archiveItem(db: Db, orgId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const archived = await tx.update(items).set({ archivedAt: new Date() })
      .where(and(eq(items.id, id), eq(items.organizationId, orgId), isNull(items.archivedAt))).returning({ id: items.id });
    if (archived.length === 0) return;
    await tx.update(carePlans).set({ active: false })
      .where(and(eq(carePlans.itemId, id), eq(carePlans.organizationId, orgId)));
  });
}
