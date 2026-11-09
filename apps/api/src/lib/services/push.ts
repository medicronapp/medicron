import { and, eq } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { member, pushDevices, pushSubscriptions, type PushDeviceRow, type PushSubscriptionRow } from "@/lib/db/schema";

export type BrowserSubscription = { endpoint: string; keys: { p256dh: string; auth: string } };

export async function saveSubscription(db: Db, userId: string, sub: BrowserSubscription): Promise<void> {
  await db.insert(pushSubscriptions)
    .values({ userId, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
    .onConflictDoUpdate({
      target: pushSubscriptions.endpoint,
      set: { userId, p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    });
}

/** Com `userId`, só apaga se a inscrição for dele; sem, remoção do sistema (endpoint expirado). */
export async function removeSubscription(db: Db, endpoint: string, userId?: string): Promise<void> {
  await db.delete(pushSubscriptions).where(
    and(eq(pushSubscriptions.endpoint, endpoint), userId ? eq(pushSubscriptions.userId, userId) : undefined),
  );
}

export async function listSubscriptionsForOrg(db: Db, orgId: string): Promise<PushSubscriptionRow[]> {
  const rows = await db
    .select({ sub: pushSubscriptions })
    .from(pushSubscriptions)
    .innerJoin(member, eq(member.userId, pushSubscriptions.userId))
    .where(eq(member.organizationId, orgId));
  return rows.map((r) => r.sub);
}

export type DeviceInput = { token: string; platform: "ios" | "android" };

/** Cadastra o aparelho; o mesmo token registrado por outra pessoa (aparelho compartilhado) passa a ser dela. */
export async function saveDevice(db: Db, userId: string, device: DeviceInput): Promise<void> {
  await db.insert(pushDevices)
    .values({ userId, token: device.token, platform: device.platform })
    .onConflictDoUpdate({ target: pushDevices.token, set: { userId, platform: device.platform } });
}

/** Com `userId`, só apaga se o aparelho for dele; sem, remoção do sistema (token que o Expo diz estar morto). */
export async function removeDevice(db: Db, token: string, userId?: string): Promise<void> {
  await db.delete(pushDevices).where(
    and(eq(pushDevices.token, token), userId ? eq(pushDevices.userId, userId) : undefined),
  );
}

/** Aparelhos dos membros da organização (quem saiu dela não recebe), sem repetir. */
export async function listDevicesForOrg(db: Db, orgId: string): Promise<PushDeviceRow[]> {
  const rows = await db
    .select({ device: pushDevices })
    .from(pushDevices)
    .innerJoin(member, eq(member.userId, pushDevices.userId))
    .where(eq(member.organizationId, orgId));
  return [...new Map(rows.map((r) => [r.device.id, r.device])).values()];
}
