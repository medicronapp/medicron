"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { createPlan, deactivatePlan, setPlanReschedule } from "@/lib/services/plans";
import { parseLocalInput } from "@/lib/time";

export async function createPlanAction(catId: string, f: FormData) {
  const { orgId } = await getOrgContext();
  const custom = Number(String(f.get("customHours") ?? "").replace(",", "."));
  const preset = Number(f.get("intervalMinutes"));
  const endRaw = String(f.get("endAt") ?? "");
  await createPlan(getDb(), orgId, {
    catId,
    itemId: String(f.get("itemId")),
    intervalMinutes: preset === 0 && custom > 0 ? Math.round(custom * 60) : preset,
    anchorAt: parseLocalInput(String(f.get("anchorAt"))),
    endAt: endRaw ? parseLocalInput(endRaw) : undefined,
    dose: String(f.get("dose") ?? "") || undefined,
    reschedule: f.get("reschedule") === "on",
  });
  revalidatePath("/", "layout");
  redirect(`/gatos/${catId}`);
}

export async function deactivatePlanAction(catId: string, planId: string) {
  const { orgId } = await getOrgContext();
  await deactivatePlan(getDb(), orgId, planId);
  revalidatePath("/", "layout");
  redirect(`/gatos/${catId}`);
}

export async function setRescheduleAction(planId: string, reschedule: boolean) {
  const { orgId } = await getOrgContext();
  await setPlanReschedule(getDb(), orgId, planId, reschedule);
  revalidatePath("/", "layout");
}
