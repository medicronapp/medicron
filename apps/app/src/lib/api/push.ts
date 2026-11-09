import type { ApiClient } from "./client";

export const registerDevice = (client: ApiClient, token: string, platform: "ios" | "android") =>
  client.request<{ ok: true }>("POST", "/push/devices", { token, platform });

export const unregisterDevice = (client: ApiClient, token: string) =>
  client.request<void>("DELETE", "/push/devices", { token });
