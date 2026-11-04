"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { createCat, updateCat, archiveCat, type CatInput } from "@/lib/services/cats";

function parse(f: FormData): CatInput {
  const weight = String(f.get("weightKg") ?? "").replace(",", ".").trim();
  return {
    name: String(f.get("name") ?? ""),
    birthDate: String(f.get("birthDate") ?? "") || undefined,
    weightKg: weight ? Number(weight) : undefined,
    notes: String(f.get("notes") ?? "") || undefined,
  };
}

export async function createCatAction(f: FormData) {
  const { orgId } = await getOrgContext();
  const cat = await createCat(getDb(), orgId, parse(f));
  revalidatePath("/gatos");
  redirect(`/gatos/${cat.id}`);
}

export async function updateCatAction(id: string, f: FormData) {
  const { orgId } = await getOrgContext();
  await updateCat(getDb(), orgId, id, parse(f));
  revalidatePath("/gatos");
  redirect(`/gatos/${id}`);
}

export async function archiveCatAction(id: string) {
  const { orgId } = await getOrgContext();
  await archiveCat(getDb(), orgId, id);
  revalidatePath("/", "layout");
  redirect("/gatos");
}
