import { eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { member, pushSubscriptions, type PushSubscriptionRow } from "@/lib/db/schema";

export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(db: Db, userId: string, sub: BrowserSubscription): Promise<void> {
  await db.insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

export async function removeSubscription(db: Db, endpoint: string): Promise<void> {
  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
}

export async function listSubscriptionsForOrg(db: Db, orgId: string): Promise<PushSubscriptionRow[]> {
  const rows = await db
    .select({ sub: pushSubscriptions })
    .from(pushSubscriptions)
    .innerJoin(member, eq(member.userId, pushSubscriptions.userId))
    .where(eq(member.organizationId, orgId));
  return rows.map((r) => r.sub);
}
