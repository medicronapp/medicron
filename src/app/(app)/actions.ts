"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { resolveSlot, TooEarly } from "@/lib/services/slots";

export async function recordDoseAction(input: {
  planId: string; scheduledFor: string; outcome: "done" | "skipped"; value?: string; note?: string;
}): Promise<{ recorded: boolean; reason?: "already" | "too-early" }> {
  const { orgId, userId } = await getOrgContext();
  try {
    const res = await resolveSlot(getDb(), orgId, userId, {
      planId: input.planId, scheduledFor: new Date(input.scheduledFor),
      outcome: input.outcome, value: input.value, note: input.note,
    });
    revalidatePath("/");
    return res.recorded ? { recorded: true } : { recorded: false, reason: "already" };
  } catch (err) {
    if (err instanceof TooEarly) return { recorded: false, reason: "too-early" };
    throw err;
  }
}
