jest.mock("@/lib/api-url", () => ({ API_URL: "" })); // na web a API é do mesmo domínio
const VAPID = "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U";
process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY = VAPID;

type Sub = { endpoint: string; toJSON: () => unknown; unsubscribe: jest.Mock };
const mockFetch = jest.fn();
const g = globalThis as Record<string, unknown>;
let sub: Sub | null;
let permission: string;
let standalone: boolean;
let ua: string;
let hasPush: boolean;
let hasSw: boolean;

const makeSub = (): Sub => ({
  endpoint: "https://push.example/abc",
  toJSON: () => ({ endpoint: "https://push.example/abc", keys: { p256dh: "p", auth: "a" } }),
  unsubscribe: jest.fn(async () => true),
});
const subscribe = jest.fn(async () => (sub = makeSub()));

function install() {
  g.fetch = mockFetch;
  g.window = { matchMedia: () => ({ matches: standalone }), atob: (s: string) => Buffer.from(s, "base64").toString("binary") };
  if (hasPush) (g.window as Record<string, unknown>).PushManager = class {};
  g.atob = (s: string) => Buffer.from(s, "base64").toString("binary");
  g.Notification = { get permission() { return permission; }, requestPermission: jest.fn(async () => { permission = nextPermission; return permission; }) };
  const reg = { pushManager: { getSubscription: async () => sub, subscribe } };
  g.navigator = {
    userAgent: ua,
    ...(hasSw ? { serviceWorker: { register: jest.fn(async () => reg), ready: Promise.resolve(reg), getRegistration: async () => reg } } : {}),
  };
}
let nextPermission = "granted";

import { disablePush, enablePush, getPushState, unregisterThisDevice } from "@/lib/push.web";

beforeEach(() => {
  jest.clearAllMocks();
  sub = null;
  permission = "default";
  nextPermission = "granted";
  standalone = false;
  ua = "Mozilla/5.0 (Macintosh)";
  hasPush = true;
  hasSw = true;
  mockFetch.mockResolvedValue({ ok: true });
  install();
});

test("sem service worker ou PushManager: não suportado", async () => {
  hasSw = false; hasPush = false; install();
  expect(await getPushState()).toBe("unsupported");
});
test("iPhone fora da tela de início (sem PushManager): precisa instalar", async () => {
  ua = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"; hasSw = false; hasPush = false; install();
  expect(await getPushState()).toBe("needs-install");
  standalone = true; install();
  expect(await getPushState()).toBe("unsupported");
});
test("permissão negada: denied; sem inscrição: default; com permissão e inscrição: enabled", async () => {
  permission = "denied"; expect(await getPushState()).toBe("denied");
  permission = "default"; expect(await getPushState()).toBe("default");
  permission = "granted"; expect(await getPushState()).toBe("default"); // permissão sem inscrição
  sub = makeSub(); expect(await getPushState()).toBe("enabled");
});
test("enablePush: pede permissão, inscreve com a chave VAPID e registra no servidor", async () => {
  expect(await enablePush()).toBe("enabled");
  const arg = (subscribe.mock.calls[0] as unknown[])[0] as { userVisibleOnly: boolean; applicationServerKey: Uint8Array };
  expect(arg.userVisibleOnly).toBe(true);
  expect(arg.applicationServerKey).toBeInstanceOf(Uint8Array);
  expect(arg.applicationServerKey.length).toBe(65);
  const [url, init] = mockFetch.mock.calls[0] as [string, { method: string; credentials: string; body: string }];
  expect(url).toBe("/api/push/subscribe");
  expect(init.method).toBe("POST");
  expect(init.credentials).toBe("include");
  expect(JSON.parse(init.body).keys).toEqual({ p256dh: "p", auth: "a" });
});
test("enablePush com permissão negada não inscreve nem chama o servidor", async () => {
  nextPermission = "denied";
  expect(await enablePush()).toBe("denied");
  expect(subscribe).not.toHaveBeenCalled();
  expect(mockFetch).not.toHaveBeenCalled();
});
test("sem a chave VAPID configurada: no-project, sem pedir permissão", async () => {
  delete process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY;
  expect(await enablePush()).toBe("no-project");
  expect(subscribe).not.toHaveBeenCalled();
  process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY = VAPID;
});
test("servidor recusa: desfaz a inscrição local e lança", async () => {
  mockFetch.mockResolvedValue({ ok: false });
  await expect(enablePush()).rejects.toThrow();
  expect(sub!.unsubscribe).toHaveBeenCalled();
});
test("unregisterThisDevice remove no servidor e no navegador; offline não lança", async () => {
  sub = makeSub(); const s = sub;
  await unregisterThisDevice();
  expect(mockFetch).toHaveBeenCalledWith("/api/push/subscribe", expect.objectContaining({ method: "DELETE", body: JSON.stringify({ endpoint: s.endpoint }) }));
  expect(s.unsubscribe).toHaveBeenCalled();
  sub = makeSub(); mockFetch.mockRejectedValue(new Error("offline"));
  await expect(unregisterThisDevice()).resolves.toBeUndefined();
});
test("disablePush faz o mesmo que sair da conta", async () => {
  sub = makeSub(); const s = sub;
  await disablePush();
  expect(s.unsubscribe).toHaveBeenCalled();
});

test("disablePush offline: lança e NÃO desinscreve localmente (o servidor ainda tem a inscrição)", async () => {
  sub = makeSub(); const s = sub;
  mockFetch.mockRejectedValue(new Error("offline"));
  await expect(disablePush()).rejects.toThrow();
  expect(s.unsubscribe).not.toHaveBeenCalled();
});
test("disablePush com o servidor recusando (não ok) também lança", async () => {
  sub = makeSub(); const s = sub;
  mockFetch.mockResolvedValue({ ok: false });
  await expect(disablePush()).rejects.toThrow();
  expect(s.unsubscribe).not.toHaveBeenCalled();
});

test("sair/excluir a conta com a sessão já inválida (401) ainda remove a inscrição do navegador", async () => {
  sub = makeSub(); const s = sub;
  mockFetch.mockResolvedValue({ ok: false, status: 401 });
  await unregisterThisDevice();
  expect(s.unsubscribe).toHaveBeenCalled();
});
test("sair offline também remove a inscrição local", async () => {
  sub = makeSub(); const s = sub;
  mockFetch.mockRejectedValue(new Error("offline"));
  await unregisterThisDevice();
  expect(s.unsubscribe).toHaveBeenCalled();
});
