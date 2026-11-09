import { API_URL } from "@/lib/api-url";

/** Rotas do Web Push (fora de `/api/v1`, mesmas do site antigo): a sessão vai pelo cookie do navegador. */
const URL_SUBSCRIBE = () => `${API_URL}/api/push/subscribe`;
const JSON_HEADERS = { "content-type": "application/json" };

export async function subscribeWebPush(sub: unknown): Promise<void> {
  const res = await fetch(URL_SUBSCRIBE(), { method: "POST", headers: JSON_HEADERS, credentials: "include", body: JSON.stringify(sub) });
  if (!res.ok) throw new Error("subscribe failed");
}

export async function unsubscribeWebPush(endpoint: string): Promise<void> {
  const res = await fetch(URL_SUBSCRIBE(), { method: "DELETE", headers: JSON_HEADERS, credentials: "include", body: JSON.stringify({ endpoint }) });
  if (!res.ok) throw new Error("unsubscribe failed");
}
