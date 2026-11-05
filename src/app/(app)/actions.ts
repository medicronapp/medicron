"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { InvalidAppliedAt, resolveSlot, TooEarly } from "@/lib/services/slots";
import { localTimeToRecent } from "@/lib/time";

export async function recordDoseAction(input: {
  planId: string; scheduledFor: string; outcome: "done" | "skipped"; value?: string; note?: string; appliedTime?: string;
}): Promise<{ recorded: boolean; reason?: "already" | "too-early" | "invalid-time" }> {
  const { orgId, userId } = await getOrgContext();
  try {
    const res = await resolveSlot(getDb(), orgId, userId, {
      planId: input.planId, scheduledFor: new Date(input.scheduledFor),
      outcome: input.outcome, value: input.value, note: input.note,
      appliedAt: input.appliedTime && /^\d{2}:\d{2}$/.test(input.appliedTime)
        ? localTimeToRecent(input.appliedTime, new Date()) : undefined,
    });
    revalidatePath("/");
    return res.recorded ? { recorded: true } : { recorded: false, reason: "already" };
  } catch (err) {
    if (err instanceof TooEarly) return { recorded: false, reason: "too-early" };
    if (err instanceof InvalidAppliedAt) return { recorded: false, reason: "invalid-time" };
    throw err;
  }
}
