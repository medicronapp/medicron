import { renderHook } from "@testing-library/react-native";

const mockListeners: ((r: unknown) => void)[] = [];
const mockRemove = jest.fn();
const mockLast: { value: unknown } = { value: null };
jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getLastNotificationResponse: jest.fn(() => mockLast.value),
  clearLastNotificationResponse: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn((fn: (r: unknown) => void) => { mockListeners.push(fn); return { remove: mockRemove }; }),
}));
const mockRouter = { push: jest.fn(), navigate: jest.fn(), replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
const mockSession = { value: { status: "signedIn" } };
jest.mock("@/lib/session", () => ({ useAppSession: () => mockSession.value }));

import * as Notifications from "expo-notifications";
import { notificationTarget, useNotificationRouting } from "@/lib/notification-routing";
import { setupNotificationHandler } from "@/lib/notification-handler";

const response = (data: unknown) => ({ notification: { request: { content: { data } } } });

beforeEach(() => {
  jest.clearAllMocks();
  mockListeners.length = 0;
  mockLast.value = null;
  mockSession.value = { status: "signedIn" };
});

describe("notificationTarget", () => {
  test.each([["/pacientes", "/pacientes"], ["/", "/"], ["/pacientes/abc?aba=dados", "/pacientes/abc?aba=dados"]])("caminho interno %s é aceito", (url, out) => {
    expect(notificationTarget({ url })).toBe(out);
  });
  test.each([
    ["https://evil.com"], ["//evil.com"], ["/\\evil.com"], ["javascript:alert(1)"], [""], [undefined], [42], [null],
  ])("url inválido (%p) cai na Hoje", (url) => {
    expect(notificationTarget({ url })).toBe("/");
  });
  test.each([[undefined], [null], ["texto"], [42], [[]]])("dados que não são objeto (%p) caem na Hoje", (data) => {
    expect(notificationTarget(data)).toBe("/");
  });
});

describe("setupNotificationHandler", () => {
  test("com o app aberto a notificação aparece (banner, lista e som), sem badge", async () => {
    setupNotificationHandler();
    const handler = (Notifications.setNotificationHandler as jest.Mock).mock.calls[0][0] as { handleNotification: () => Promise<Record<string, boolean>> };
    expect(await handler.handleNotification()).toEqual({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false });
  });
});

describe("useNotificationRouting", () => {
  test("partida a frio: a notificação que abriu o app navega uma vez (não repete em re-render)", async () => {
    mockLast.value = response({ url: "/pacientes" });
    const { rerender } = await renderHook(() => useNotificationRouting());
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith("/pacientes");
    expect(Notifications.clearLastNotificationResponse).toHaveBeenCalledTimes(1);
    await rerender({});
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
  });

  test("com o app aberto ou em segundo plano: a resposta navega", async () => {
    await renderHook(() => useNotificationRouting());
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    mockListeners[0](response({ url: "/itens" }));
    expect(mockRouter.navigate).toHaveBeenCalledWith("/itens");
  });

  test("url externo ou malformado abre a Hoje", async () => {
    await renderHook(() => useNotificationRouting());
    mockListeners[0](response({ url: "https://evil.com" }));
    expect(mockRouter.navigate).toHaveBeenLastCalledWith("/");
    mockListeners[0](response({}));
    expect(mockRouter.navigate).toHaveBeenLastCalledWith("/");
  });

  test("sem sessão não navega; navega depois que a sessão chega (uma vez)", async () => {
    mockSession.value = { status: "loading" };
    mockLast.value = response({ url: "/pacientes" });
    const { rerender } = await renderHook(() => useNotificationRouting());
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    mockSession.value = { status: "signedOut" };
    await rerender({});
    expect(mockRouter.navigate).not.toHaveBeenCalled();
    mockSession.value = { status: "signedIn" };
    await rerender({});
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
    expect(mockRouter.navigate).toHaveBeenCalledWith("/pacientes");
    await rerender({});
    expect(mockRouter.navigate).toHaveBeenCalledTimes(1);
  });

  test("remove o listener ao desmontar", async () => {
    const { unmount } = await renderHook(() => useNotificationRouting());
    await unmount();
    expect(mockRemove).toHaveBeenCalledTimes(1);
  });
});
