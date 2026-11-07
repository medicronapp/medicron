"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { createPlan, deactivatePlan, updatePlan } from "@/lib/services/plans";
import { parseLocalInput } from "@/lib/time";

export async function createPlanAction(patientId: string, f: FormData) {
  const { orgId } = await getOrgContext();
  const custom = Number(String(f.get("customHours") ?? "").replace(",", "."));
  const preset = Number(f.get("intervalMinutes"));
  const endRaw = String(f.get("endAt") ?? "");
  await createPlan(getDb(), orgId, {
    patientId,
    itemId: String(f.get("itemId")),
    intervalMinutes: preset === 0 && custom > 0 ? Math.round(custom * 60) : preset,
    anchorAt: parseLocalInput(String(f.get("anchorAt"))),
    endAt: endRaw ? parseLocalInput(endRaw) : undefined,
    dose: String(f.get("dose") ?? "") || undefined,
    reschedule: f.get("reschedule") === "on",
  });
  revalidatePath("/", "layout");
  redirect(`/pacientes/${patientId}`);
}

export async function deactivatePlanAction(patientId: string, planId: string) {
  const { orgId } = await getOrgContext();
  await deactivatePlan(getDb(), orgId, planId);
  revalidatePath("/", "layout");
  redirect(`/pacientes/${patientId}`);
}

/** Edita dose, data final e reprogramação de uma rotina. Devolve a mensagem de erro, se houver. */
export async function updatePlanAction(planId: string, f: FormData): Promise<{ error?: string }> {
  const { orgId } = await getOrgContext();
  const endRaw = String(f.get("endAt") ?? "");
  try {
    await updatePlan(getDb(), orgId, planId, {
      dose: String(f.get("dose") ?? "").trim() || null,
      endAt: endRaw ? parseLocalInput(endRaw) : null,
      reschedule: f.get("reschedule") === "on",
    });
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("A data final")) return { error: err.message };
    throw err;
  }
  revalidatePath("/", "layout");
  return {};
}
