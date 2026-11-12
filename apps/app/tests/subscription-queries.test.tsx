import { act, renderHook, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/api/query";
import type { MeDto, SubscriptionDto } from "@medicron/shared";

const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn", orgCount: 1, activeOrgId: "o1", signOut: jest.fn() }) }));

import { afterPurchase, useSubscription } from "@/lib/subscription-queries";

const FREE: SubscriptionDto = { tier: "free", plusUntil: null, source: null, willRenew: false, limits: { patients: 2, members: 2, historyDays: 30 }, usage: { patients: 1, members: 1 } };
const PLUS: SubscriptionDto = { tier: "plus", plusUntil: "2027-11-10T00:00:00.000Z", source: "apple", willRenew: true, limits: { patients: null, members: 8, historyDays: null }, usage: { patients: 5, members: 3 } };
const me = (subscription: SubscriptionDto): MeDto => ({ user: { id: "u1", name: "Ana", email: "a@x.com" }, orgId: "o1", role: "owner", subscription });

const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

beforeEach(() => { jest.clearAllMocks(); queryClient.clear(); jest.useRealTimers(); });
afterEach(() => { jest.useRealTimers(); queryClient.clear(); });
afterAll(() => queryClient.clear());

test("useSubscription lê a assinatura da conta no /me", async () => {
  mockRequest.mockResolvedValue(me(PLUS));
  const { result } = await renderHook(() => useSubscription(), { wrapper });
  await waitFor(() => expect(result.current.subscription).toEqual(PLUS));
  expect(result.current.isPlus).toBe(true);
  expect(result.current.limits.members).toBe(8);
});

test("enquanto carrega, assume o grátis (nunca libera por engano) e isPlus é falso", async () => {
  let release!: (v: MeDto) => void;
  mockRequest.mockReturnValue(new Promise<MeDto>((resolve) => { release = resolve; })); // pendente até o fim do teste (sem promessa eterna)
  const { result } = await renderHook(() => useSubscription(), { wrapper });
  expect(result.current.subscription).toBeNull();
  expect(result.current.isPlus).toBe(false);
  expect(result.current.limits).toEqual(FREE.limits);
  release(me(FREE));
});

describe("afterPurchase: sincroniza e confere até a conta virar Plus", () => {
  test("a primeira sincronização já traz o Plus: para na hora, atualiza o /me e devolve true", async () => {
    mockRequest.mockResolvedValueOnce({ subscription: PLUS }).mockResolvedValue(me(PLUS));
    expect(await afterPurchase()).toBe(true);
    expect(mockRequest).toHaveBeenCalledWith("POST", "/subscription/sync");
  });

  test("tenta de novo a cada 2 s enquanto ainda é grátis e para quando vira Plus", async () => {
    jest.useFakeTimers();
    mockRequest
      .mockResolvedValueOnce({ subscription: FREE })
      .mockResolvedValueOnce({ subscription: FREE })
      .mockResolvedValueOnce({ subscription: PLUS })
      .mockResolvedValue(me(PLUS));
    const done = afterPurchase();
    await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
    await act(async () => { await jest.advanceTimersByTimeAsync(2000); });
    expect(await done).toBe(true);
    expect(mockRequest.mock.calls.filter((c) => c[0] === "POST")).toHaveLength(3);
  });

  test("desiste sem erro depois de ~20 s (false); falha da sincronização não interrompe as tentativas", async () => {
    jest.useFakeTimers();
    mockRequest.mockRejectedValue(new Error("503"));
    const done = afterPurchase();
    await act(async () => { await jest.advanceTimersByTimeAsync(25_000); });
    expect(await done).toBe(false);
    expect(mockRequest.mock.calls.length).toBeGreaterThan(5);
  });
});
