"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { dismissChecklist, markWelcomeSeen } from "@/lib/services/onboarding";
import { InvalidAppliedAt, resolveSlot, TooEarly } from "@/lib/services/slots";
import { resolveAppliedTime } from "@/lib/time";

export async function recordDoseAction(input: {
  planId: string; scheduledFor: string; outcome: "done" | "skipped"; value?: string; note?: string; appliedTime?: string;
}): Promise<{ recorded: boolean; reason?: "already" | "too-early" | "invalid-time" }> {
  const { orgId, userId } = await getOrgContext();
  const scheduledFor = new Date(input.scheduledFor);
  const now = new Date();
  const appliedAt = input.appliedTime ? resolveAppliedTime(input.appliedTime, scheduledFor, now) : undefined;
  if (appliedAt === null) return { recorded: false, reason: "invalid-time" };
  try {
    const res = await resolveSlot(getDb(), orgId, userId, {
      planId: input.planId, scheduledFor, now,
      outcome: input.outcome, value: input.value, note: input.note,
      appliedAt,
    });
    revalidatePath("/");
    return res.recorded ? { recorded: true } : { recorded: false, reason: "already" };
  } catch (err) {
    if (err instanceof TooEarly) return { recorded: false, reason: "too-early" };
    if (err instanceof InvalidAppliedAt) return { recorded: false, reason: "invalid-time" };
    throw err;
  }
}

/** O usuário concluiu ou pulou as boas-vindas: não mostrar de novo. */
export async function completeWelcomeAction(): Promise<void> {
  const { userId } = await getOrgContext();
  await markWelcomeSeen(getDb(), userId);
  revalidatePath("/");
}

/** O usuário concluiu ou dispensou o checklist de primeiros passos. */
export async function dismissChecklistAction(): Promise<void> {
  const { userId } = await getOrgContext();
  await dismissChecklist(getDb(), userId);
  revalidatePath("/");
}
