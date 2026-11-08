import { renderHook, waitFor, act } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";
import { fetchHome, recordDose, completeWelcome, dismissChecklist } from "@/lib/api/home";
import { useRecordDose } from "@/lib/home-queries";

const fake = () => ({ request: jest.fn() });
const as = (c: ReturnType<typeof fake>) => c as unknown as Parameters<typeof fetchHome>[0];
const body = { planId: "p1", scheduledFor: "2026-11-07T11:00:00.000Z", outcome: "done" as const };

afterEach(() => { queryClient.clear(); queryClient.getMutationCache().clear(); });
afterAll(() => queryClient.clear());

describe("fetchHome", () => {
  test("GET /home sem dia", async () => {
    const c = fake();
    c.request.mockResolvedValue({ home: {}, hasPatients: true, onboarding: {} });
    await fetchHome(as(c));
    expect(c.request).toHaveBeenCalledWith("GET", "/home");
  });
  test("GET /home?dia= com dia, codificado", async () => {
    const c = fake();
    c.request.mockResolvedValue({});
    await fetchHome(as(c), "2026-11-03");
    expect(c.request).toHaveBeenCalledWith("GET", "/home?dia=2026-11-03");
  });
});

describe("recordDose", () => {
  test("registrada", async () => {
    const c = fake();
    c.request.mockResolvedValue({ recorded: true });
    expect(await recordDose(as(c), body)).toEqual({ recorded: true });
    expect(c.request).toHaveBeenCalledWith("POST", "/doses", body);
  });
  test("já registrada por outra pessoa", async () => {
    const c = fake();
    c.request.mockResolvedValue({ recorded: false, reason: "already" });
    expect(await recordDose(as(c), body)).toEqual({ recorded: false, reason: "already" });
  });
  test("409 too_early e 422 invalid_applied_at viram motivos", async () => {
    const c = fake();
    c.request.mockRejectedValueOnce(new ApiClientError(409, "too_early", "x"));
    expect(await recordDose(as(c), body)).toEqual({ recorded: false, reason: "too-early" });
    c.request.mockRejectedValueOnce(new ApiClientError(422, "invalid_applied_at", "x"));
    expect(await recordDose(as(c), body)).toEqual({ recorded: false, reason: "invalid-time" });
  });
  test("outros erros propagam", async () => {
    const c = fake();
    c.request.mockRejectedValue(new ApiClientError(500, "unknown", "x"));
    await expect(recordDose(as(c), body)).rejects.toBeInstanceOf(ApiClientError);
  });
});

test("completeWelcome e dismissChecklist fazem POST", async () => {
  const c = fake();
  c.request.mockResolvedValue(undefined);
  await completeWelcome(as(c));
  await dismissChecklist(as(c));
  expect(c.request).toHaveBeenNthCalledWith(1, "POST", "/onboarding/welcome");
  expect(c.request).toHaveBeenNthCalledWith(2, "POST", "/onboarding/checklist/dismiss");
});

jest.mock("@/lib/api", () => ({ apiClient: { request: jest.fn() } }));
// O cliente real do better-auth mantém temporizadores; aqui só interessa o status.
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn" }) }));

describe("useRecordDose", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;

  test.each([
    ["registrada", { recorded: true }],
    ["já registrada", { recorded: false, reason: "already" }],
  ])("%s: invalida ['home']", async (_n, reply) => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("@/lib/api").apiClient.request as jest.Mock).mockResolvedValue(reply);
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useRecordDose(), { wrapper });
    await act(async () => { await result.current.mutateAsync(body); });
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ["home"] }));
  });

  test("antes do horário não invalida (nada mudou)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require("@/lib/api").apiClient.request as jest.Mock).mockRejectedValue(new ApiClientError(409, "too_early", "x"));
    const invalidate = jest.spyOn(queryClient, "invalidateQueries");
    invalidate.mockClear();
    const { result } = await renderHook(() => useRecordDose(), { wrapper });
    await act(async () => { await result.current.mutateAsync(body); });
    expect(invalidate).not.toHaveBeenCalled();
  });
});
