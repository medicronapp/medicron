import { and, asc, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { Db } from "@/lib/db";
import { cats, carePlans, type Cat } from "@/lib/db/schema";

export const catInput = z.object({
  name: z.string().trim().min(1, "Informe o nome").max(60),
  birthDate: z.string().date().optional(),
  weightKg: z.number().positive().max(30).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CatInput = z.input<typeof catInput>;

const toRow = (i: z.output<typeof catInput>) => ({
  name: i.name,
  birthDate: i.birthDate ?? null,
  weightKg: i.weightKg === undefined ? null : String(i.weightKg),
  notes: i.notes || null,
});

export async function createCat(db: Db, orgId: string, input: CatInput): Promise<Cat> {
  const [row] = await db.insert(cats).values({ organizationId: orgId, ...toRow(catInput.parse(input)) }).returning();
  return row;
}

export function listCats(db: Db, orgId: string): Promise<Cat[]> {
  return db.select().from(cats)
    .where(and(eq(cats.organizationId, orgId), isNull(cats.archivedAt)))
    .orderBy(asc(cats.name));
}

export async function getCat(db: Db, orgId: string, id: string): Promise<Cat | null> {
  const [row] = await db.select().from(cats)
    .where(and(eq(cats.id, id), eq(cats.organizationId, orgId), isNull(cats.archivedAt))).limit(1);
  return row ?? null;
}

export async function updateCat(db: Db, orgId: string, id: string, input: CatInput): Promise<Cat | null> {
  const [row] = await db.update(cats).set(toRow(catInput.parse(input)))
    .where(and(eq(cats.id, id), eq(cats.organizationId, orgId), isNull(cats.archivedAt))).returning();
  return row ?? null;
}

export async function archiveCat(db: Db, orgId: string, id: string): Promise<void> {
  await db.transaction(async (tx) => {
    const archived = await tx.update(cats).set({ archivedAt: new Date() })
      .where(and(eq(cats.id, id), eq(cats.organizationId, orgId), isNull(cats.archivedAt))).returning({ id: cats.id });
    if (archived.length === 0) return;
    await tx.update(carePlans).set({ active: false })
      .where(and(eq(carePlans.catId, id), eq(carePlans.organizationId, orgId)));
  });
}
