"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { createItem, updateItem, archiveItem, type ItemInput } from "@/lib/services/items";

function parse(f: FormData): ItemInput {
  return {
    name: String(f.get("name") ?? ""),
    kind: String(f.get("kind")) as ItemInput["kind"],
    defaultDose: String(f.get("defaultDose") ?? "") || undefined,
    notes: String(f.get("notes") ?? "") || undefined,
  };
}

export async function createItemAction(f: FormData) {
  const { orgId } = await getOrgContext();
  const item = await createItem(getDb(), orgId, parse(f));
  revalidatePath("/itens");
  redirect(`/itens?tipo=${item.kind}`);
}

export async function updateItemAction(id: string, f: FormData) {
  const { orgId } = await getOrgContext();
  const item = await updateItem(getDb(), orgId, id, parse(f));
  revalidatePath("/itens");
  redirect(`/itens?tipo=${item?.kind ?? "medication"}`);
}

export async function archiveItemAction(id: string) {
  const { orgId } = await getOrgContext();
  await archiveItem(getDb(), orgId, id);
  revalidatePath("/", "layout");
  redirect("/itens");
}
