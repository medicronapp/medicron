import { renderHook, act, waitFor } from "@testing-library/react-native";
import { QueryClientProvider } from "@tanstack/react-query";
import { ApiClientError } from "@/lib/api/errors";
import { queryClient } from "@/lib/api/query";
import { fetchPatients, fetchPatient, createPatient, updatePatient, archivePatient } from "@/lib/api/patients";
import { fetchPlans, createPlan, updatePlan, deactivatePlan } from "@/lib/api/plans";
import { fetchItems } from "@/lib/api/items";
import { useCreatePatient, useArchivePatient, useUpdatePlan, useDeactivatePlan, useCreatePlan } from "@/lib/patient-queries";

const mockRequest = jest.fn();
jest.mock("@/lib/api", () => ({ apiClient: { request: (...a: unknown[]) => mockRequest(...a) } }));
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn" }) }));

const fake = () => ({ request: jest.fn() });
const as = (c: ReturnType<typeof fake>) => c as unknown as Parameters<typeof fetchPatients>[0];

beforeEach(() => mockRequest.mockReset());
afterEach(() => { queryClient.clear(); queryClient.getMutationCache().clear(); });

describe("pacientes", () => {
  test("fetchPatients e fetchPatient desembrulham a resposta", async () => {
    const c = fake();
    c.request.mockResolvedValueOnce({ patients: [{ id: "a" }] }).mockResolvedValueOnce({ patient: { id: "a" } });
    expect(await fetchPatients(as(c))).toEqual([{ id: "a" }]);
    expect(await fetchPatient(as(c), "a")).toEqual({ id: "a" });
    expect(c.request).toHaveBeenNthCalledWith(1, "GET", "/patients");
    expect(c.request).toHaveBeenNthCalledWith(2, "GET", "/patients/a");
  });
  test("criar, atualizar e arquivar", async () => {
    const c = fake();
    c.request.mockResolvedValue({ patient: { id: "a" } });
    const body = { name: "Izzy", species: "cat" as const };
    expect(await createPatient(as(c), body)).toEqual({ id: "a" });
    expect(c.request).toHaveBeenLastCalledWith("POST", "/patients", body);
    await updatePatient(as(c), "a", body);
    expect(c.request).toHaveBeenLastCalledWith("PATCH", "/patients/a", body);
    c.request.mockResolvedValue(undefined);
    await archivePatient(as(c), "a");
    expect(c.request).toHaveBeenLastCalledWith("DELETE", "/patients/a");
  });
  test("404 propaga como ApiClientError", async () => {
    const c = fake();
    c.request.mockRejectedValue(new ApiClientError(404, "not_found", "Paciente não encontrado."));
    await expect(fetchPatient(as(c), "x")).rejects.toBeInstanceOf(ApiClientError);
  });
});

describe("rotinas e itens", () => {
  test("listar, criar, editar e encerrar", async () => {
    const c = fake();
    c.request.mockResolvedValueOnce({ plans: [{ id: "p" }] });
    expect(await fetchPlans(as(c), "a")).toEqual([{ id: "p" }]);
    expect(c.request).toHaveBeenLastCalledWith("GET", "/patients/a/plans");
    c.request.mockResolvedValue({ plan: { id: "p" } });
    const body = { itemId: "i", intervalMinutes: 480, anchorAt: "2026-11-08T11:00:00.000Z" };
    expect(await createPlan(as(c), "a", body)).toEqual({ id: "p" });
    expect(c.request).toHaveBeenLastCalledWith("POST", "/patients/a/plans", body);
    await updatePlan(as(c), "p", { dose: null });
    expect(c.request).toHaveBeenLastCalledWith("PATCH", "/plans/p", { dose: null });
    c.request.mockResolvedValue(undefined);
    await deactivatePlan(as(c), "p");
    expect(c.request).toHaveBeenLastCalledWith("DELETE", "/plans/p");
  });
  test("fetchItems", async () => {
    const c = fake();
    c.request.mockResolvedValue({ items: [{ id: "i" }] });
    expect(await fetchItems(as(c))).toEqual([{ id: "i" }]);
    expect(c.request).toHaveBeenCalledWith("GET", "/items");
  });
});

describe("invalidação do cache", () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  const keys = (spy: jest.SpyInstance) => spy.mock.calls.map((c) => (c[0] as { queryKey: unknown[] }).queryKey[0]);

  test("criar paciente invalida a lista de pacientes e a Hoje (o vazio e o checklist dependem dele)", async () => {
    mockRequest.mockResolvedValue({ patient: { id: "a" } });
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useCreatePatient(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ name: "Izzy", species: "cat" }); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["patients", "home"])));
  });

  test("arquivar paciente invalida a lista e a Hoje e remove o detalhe e as rotinas dele do cache (sem rebuscar um 404)", async () => {
    mockRequest.mockResolvedValue(undefined);
    queryClient.setQueryData(["patient", "a"], { id: "a" });
    queryClient.setQueryData(["plans", "a"], []);
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useArchivePatient(), { wrapper });
    await act(async () => { await result.current.mutateAsync("a"); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["patients", "home"])));
    expect(keys(spy)).not.toContain("patient");
    expect(queryClient.getQueryData(["patient", "a"])).toBeUndefined();
    expect(queryClient.getQueryData(["plans", "a"])).toBeUndefined();
  });

  test("encerrar rotina invalida rotinas, pacientes e Hoje", async () => {
    mockRequest.mockResolvedValue(undefined);
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useDeactivatePlan(), { wrapper });
    await act(async () => { await result.current.mutateAsync("p"); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["patients", "patient", "plans", "home"])));
  });

  test("editar e criar rotina invalidam rotinas e Hoje", async () => {
    mockRequest.mockResolvedValue({ plan: { id: "p" } });
    const spy = jest.spyOn(queryClient, "invalidateQueries");
    const { result } = await renderHook(() => useUpdatePlan(), { wrapper });
    await act(async () => { await result.current.mutateAsync({ planId: "p", body: { dose: "1" } }); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["plans", "home"])));
    spy.mockClear();
    const r2 = await renderHook(() => useCreatePlan(), { wrapper });
    await act(async () => { await r2.result.current.mutateAsync({ patientId: "a", body: { itemId: "i", intervalMinutes: 480, anchorAt: "2026-11-08T11:00:00.000Z" } }); });
    await waitFor(() => expect(keys(spy)).toEqual(expect.arrayContaining(["plans", "home"])));
  });
});
