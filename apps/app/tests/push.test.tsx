import { Platform } from "react-native";
import { renderHook, waitFor } from "@testing-library/react-native";

const mockProject: { id: string | undefined } = { id: "proj-123" };
jest.mock("expo-constants", () => ({
  __esModule: true,
  default: { get expoConfig() { return { extra: { eas: { projectId: mockProject.id } } }; } },
}));
const mockStore = new Map<string, string>();
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async (k: string) => mockStore.get(k) ?? null),
  setItemAsync: jest.fn(async (k: string, v: string) => { mockStore.set(k, v); }),
  deleteItemAsync: jest.fn(async (k: string) => { mockStore.delete(k); }),
}));
const mockNotif = {
  perm: { status: "undetermined", granted: false, canAskAgain: true } as { status: string; granted: boolean; canAskAgain: boolean },
  requestResult: { status: "granted", granted: true, canAskAgain: true },
  token: "ExponentPushToken[abc]",
};
jest.mock("expo-notifications", () => ({
  AndroidImportance: { HIGH: 4 },
  getPermissionsAsync: jest.fn(async () => mockNotif.perm),
  requestPermissionsAsync: jest.fn(async () => { mockNotif.perm = mockNotif.requestResult; return mockNotif.requestResult; }),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: mockNotif.token })),
  setNotificationChannelAsync: jest.fn(async () => {}),
}));
const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));
const mockSession = { value: { status: "signedIn" } };
jest.mock("@/lib/session", () => ({ useAppSession: () => mockSession.value }));

import * as Notifications from "expo-notifications";
import { disablePush, enablePush, getPushState, unregisterThisDevice } from "@/lib/push";
import { usePushSync } from "@/lib/push-sync";

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.clear();
  mockProject.id = "proj-123";
  mockNotif.perm = { status: "undetermined", granted: false, canAskAgain: true };
  mockNotif.requestResult = { status: "granted", granted: true, canAskAgain: true };
  mockNotif.token = "ExponentPushToken[abc]";
  mockRequest.mockResolvedValue({ ok: true });
  mockSession.value = { status: "signedIn" };
  (Platform as { OS: string }).OS = "ios";
});

describe("getPushState", () => {
  test("sem projectId do EAS: indisponível", async () => {
    mockProject.id = undefined;
    expect(await getPushState()).toBe("unsupported");
  });
  test("na web: indisponível", async () => {
    (Platform as { OS: string }).OS = "web";
    expect(await getPushState()).toBe("unsupported");
  });
  test("permissão ainda não decidida: default", async () => {
    expect(await getPushState()).toBe("default");
  });
  test("negada: denied", async () => {
    mockNotif.perm = { status: "denied", granted: false, canAskAgain: false };
    expect(await getPushState()).toBe("denied");
  });
  test("concedida mas sem token registrado neste aparelho: default (dá para ativar sem pedir de novo)", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    expect(await getPushState()).toBe("default");
  });
  test("concedida e com token registrado: enabled", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    mockStore.set("medicron.pushToken", "ExponentPushToken[abc]");
    expect(await getPushState()).toBe("enabled");
  });
});

describe("enablePush", () => {
  test("pede a permissão, cria o canal Android, registra o token com a plataforma certa e guarda o token", async () => {
    (Platform as { OS: string }).OS = "android";
    expect(await enablePush()).toBe("enabled");
    expect(Notifications.requestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith("default", expect.objectContaining({ importance: 4 }));
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({ projectId: "proj-123" });
    expect(mockRequest).toHaveBeenCalledWith("POST", "/push/devices", { token: "ExponentPushToken[abc]", platform: "android" });
    expect(mockStore.get("medicron.pushToken")).toBe("ExponentPushToken[abc]");
  });

  test("no iOS não cria canal e registra como ios", async () => {
    await enablePush();
    expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
    expect(mockRequest).toHaveBeenCalledWith("POST", "/push/devices", { token: "ExponentPushToken[abc]", platform: "ios" });
  });

  test("permissão já concedida não pede de novo", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    await enablePush();
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test("permissão negada: 'denied', sem token e sem chamar a API", async () => {
    mockNotif.requestResult = { status: "denied", granted: false, canAskAgain: false };
    expect(await enablePush()).toBe("denied");
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("negada de vez (não dá para perguntar de novo): 'denied' sem perguntar", async () => {
    mockNotif.perm = { status: "denied", granted: false, canAskAgain: false };
    expect(await enablePush()).toBe("denied");
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test("sem projectId: 'no-project' sem chamar a API", async () => {
    mockProject.id = undefined;
    expect(await enablePush()).toBe("no-project");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("erro de rede ao registrar lança e não guarda o token (estado consistente)", async () => {
    mockRequest.mockRejectedValue(new Error("rede"));
    await expect(enablePush()).rejects.toThrow("rede");
    expect(mockStore.has("medicron.pushToken")).toBe(false);
  });

  test("ativar de novo limpa a marca de 'desativei'", async () => {
    mockStore.set("medicron.pushOptOut", "1");
    await enablePush();
    expect(mockStore.has("medicron.pushOptOut")).toBe(false);
  });
});

describe("disablePush e unregisterThisDevice", () => {
  test("disablePush desregistra, apaga o token e marca que o usuário desativou", async () => {
    mockStore.set("medicron.pushToken", "ExponentPushToken[abc]");
    await disablePush();
    expect(mockRequest).toHaveBeenCalledWith("DELETE", "/push/devices", { token: "ExponentPushToken[abc]" });
    expect(mockStore.has("medicron.pushToken")).toBe(false);
    expect(mockStore.get("medicron.pushOptOut")).toBe("1");
  });

  test("disablePush não lança se a API falhar (e ainda limpa localmente)", async () => {
    mockStore.set("medicron.pushToken", "ExponentPushToken[abc]");
    mockRequest.mockRejectedValue(new Error("rede"));
    await expect(disablePush()).resolves.toBeUndefined();
    expect(mockStore.has("medicron.pushToken")).toBe(false);
  });

  test("unregisterThisDevice desregistra sem marcar 'desativei' (sair não é desativar)", async () => {
    mockStore.set("medicron.pushToken", "ExponentPushToken[abc]");
    await unregisterThisDevice();
    expect(mockRequest).toHaveBeenCalledWith("DELETE", "/push/devices", { token: "ExponentPushToken[abc]" });
    expect(mockStore.has("medicron.pushToken")).toBe(false);
    expect(mockStore.has("medicron.pushOptOut")).toBe(false);
  });

  test("unregisterThisDevice não espera mais que o limite e nunca lança", async () => {
    jest.useFakeTimers();
    mockStore.set("medicron.pushToken", "ExponentPushToken[abc]");
    mockRequest.mockReturnValue(new Promise(() => {})); // rede pendurada
    const p = unregisterThisDevice();
    await jest.advanceTimersByTimeAsync(3100);
    await expect(p).resolves.toBeUndefined();
    jest.useRealTimers();
  });

  test("sem token guardado não chama a API", async () => {
    await unregisterThisDevice();
    expect(mockRequest).not.toHaveBeenCalled();
  });
});

describe("usePushSync", () => {
  test("com permissão já concedida e sem token guardado, registra o token atual", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    await renderHook(() => usePushSync());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith("POST", "/push/devices", { token: "ExponentPushToken[abc]", platform: "ios" }));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  });

  test("não pede permissão sozinho", async () => {
    await renderHook(() => usePushSync());
    await new Promise((r) => setTimeout(r, 20));
    expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("não repete o registro quando o token é o mesmo", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    mockStore.set("medicron.pushToken", "ExponentPushToken[abc]");
    await renderHook(() => usePushSync());
    await new Promise((r) => setTimeout(r, 20));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("token novo (o do sistema mudou): registra o novo", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    mockStore.set("medicron.pushToken", "ExponentPushToken[velho]");
    await renderHook(() => usePushSync());
    await waitFor(() => expect(mockRequest).toHaveBeenCalledWith("POST", "/push/devices", expect.objectContaining({ token: "ExponentPushToken[abc]" })));
    expect(mockStore.get("medicron.pushToken")).toBe("ExponentPushToken[abc]");
  });

  test("quem desativou não é reativado sozinho", async () => {
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    mockStore.set("medicron.pushOptOut", "1");
    await renderHook(() => usePushSync());
    await new Promise((r) => setTimeout(r, 20));
    expect(mockRequest).not.toHaveBeenCalled();
  });

  test("sem sessão não faz nada; erro da API não derruba", async () => {
    mockSession.value = { status: "signedOut" };
    await renderHook(() => usePushSync());
    await new Promise((r) => setTimeout(r, 20));
    expect(mockRequest).not.toHaveBeenCalled();
    mockSession.value = { status: "signedIn" };
    mockNotif.perm = { status: "granted", granted: true, canAskAgain: true };
    mockRequest.mockRejectedValue(new Error("rede"));
    await expect(renderHook(() => usePushSync())).resolves.toBeDefined();
  });
});
