import webpush from "web-push";
import type { PushSender } from "@/lib/services/dispatch";

let configured = false;

export const webPushSender: PushSender = async (sub, payload) => {
  if (!configured) {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT!, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!,
    );
    configured = true;
  }
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 },
    );
    return { ok: true };
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return { ok: false, gone: true };
    throw err;
  }
};
