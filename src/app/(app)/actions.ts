"use server";
import { revalidatePath } from "next/cache";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { recordDose } from "@/lib/services/doses";

export async function recordDoseAction(input: {
  planId: string; scheduledFor: string; outcome: "done" | "skipped"; value?: string; note?: string;
}): Promise<{ recorded: boolean }> {
  const { orgId, userId } = await getOrgContext();
  const res = await recordDose(getDb(), orgId, userId, {
    planId: input.planId, scheduledFor: new Date(input.scheduledFor),
    outcome: input.outcome, value: input.value, note: input.note,
  });
  revalidatePath("/");
  return { recorded: res.recorded };
}
