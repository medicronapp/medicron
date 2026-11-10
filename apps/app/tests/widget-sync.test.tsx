import { Platform } from "react-native";
import { renderHook } from "@testing-library/react-native";
import type { HomeDto } from "@medicron/shared";

const mockUpdate = jest.fn(); // médio
const mockUpdateAgora = jest.fn();
const mockUpdateProgresso = jest.fn();
jest.mock("@/widgets/medicron-widget", () => ({ __esModule: true, default: { updateTimeline: (...a: unknown[]) => mockUpdate(...a) } }));
jest.mock("@/widgets/medicron-agora-widget", () => ({ __esModule: true, default: { updateTimeline: (...a: unknown[]) => mockUpdateAgora(...a) } }));
jest.mock("@/widgets/medicron-progresso-widget", () => ({ __esModule: true, default: { updateTimeline: (...a: unknown[]) => mockUpdateProgresso(...a) } }));
const mockSession = { value: { status: "signedIn" } as { status: string } };
jest.mock("@/lib/session", () => ({ useAppSession: () => mockSession.value }));
const mockHome: { data: { home: HomeDto } | undefined } = { data: undefined };
jest.mock("@/lib/home-queries", () => ({ useCachedHome: () => mockHome.data }));

import { clearWidget, useWidgetSync } from "@/lib/widget-sync";

const HOUR = 3_600_000;
const home = (n: number): HomeDto => ({
  // Horários relativos a agora: o hook usa o relógio real. Dose i fica daqui a 2 + i horas (sempre "próxima").
  now: new Date().toISOString(), todayKey: new Date(Date.now() - 3 * HOUR).toISOString().slice(0, 10), selectedKey: "", selectedStatus: "open",
  streak: { days: 0, atRisk: false, pendingKeys: [] }, week: [], progress: { resolved: 0, total: n }, closedToday: false,
  attention: [], patients: [{ patientId: "p", patientName: "Mel", total: n, resolved: 0, missed: 0, entries: Array.from({ length: n }, (_, i) => ({
    planId: `pl${i}`, scheduledFor: new Date(Date.now() + (2 + i) * HOUR).toISOString(), patientId: "p", patientName: "Mel", itemName: `R${i}`, kind: "medication" as const,
    dose: null, reschedule: false, state: "later" as const, resolvedBy: null, resolvedAt: null, late: false, value: null, note: null,
  })) }],
});

const setPlatform = (os: string) => Object.defineProperty(Platform, "OS", { get: () => os, configurable: true });
const original = Platform.OS;
afterAll(() => setPlatform(original));
beforeEach(() => {
  jest.clearAllMocks();
  for (const m of [mockUpdate, mockUpdateAgora, mockUpdateProgresso]) m.mockReset();
  setPlatform("ios");
  mockSession.value = { status: "signedIn" };
  mockHome.data = undefined;
});

test("com sessão e a Hoje carregada, entrega a timeline ao widget", async () => {
  mockHome.data = { home: home(2) };
  await renderHook(() => useWidgetSync());
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  const entries = mockUpdate.mock.calls[0][0] as { date: Date; props: { status: string; upcoming: { item: string }[] } }[];
  expect(entries[0].props.status).toBe("ok");
  expect(entries[0].props.upcoming.map((i) => i.item)).toEqual(["R0", "R1"]);
});

test("quando a Hoje muda (dose registrada), a timeline é refeita", async () => {
  mockHome.data = { home: home(2) };
  const { rerender } = await renderHook(() => useWidgetSync());
  mockHome.data = { home: home(1) };
  await rerender({});
  expect(mockUpdate).toHaveBeenCalledTimes(2);
  expect((mockUpdate.mock.calls[1][0] as { props: { upcoming: unknown[] } }[])[0].props.upcoming).toHaveLength(1);
});

test("com sessão mas sem dados ainda: não mexe no widget", async () => {
  await renderHook(() => useWidgetSync());
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("sem sessão: limpa o widget (nenhum nome de paciente fica na tela inicial)", async () => {
  mockSession.value = { status: "signedOut" };
  await renderHook(() => useWidgetSync());
  expect(mockUpdate).toHaveBeenCalledTimes(1);
  expect((mockUpdate.mock.calls[0][0] as { props: { status: string } }[])[0].props.status).toBe("signedOut");
});

test("clearWidget manda só o estado sem sessão", () => {
  clearWidget();
  const [entries] = mockUpdate.mock.calls[0] as [{ props: { status: string; upcoming: unknown[]; pendingCount: number } }[]];
  expect(entries).toHaveLength(1);
  expect(entries[0].props).toMatchObject({ status: "signedOut", upcoming: [], pendingCount: 0 });
});

test.each(["android", "web"])("%s: não toca no widget (é só do iOS)", async (os) => {
  setPlatform(os);
  mockHome.data = { home: home(2) };
  await renderHook(() => useWidgetSync());
  clearWidget();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("se o módulo do widget lançar, o app não quebra (o widget é cortesia)", async () => {
  mockUpdate.mockImplementation(() => { throw new Error("native"); });
  mockHome.data = { home: home(1) };
  await expect(renderHook(() => useWidgetSync())).resolves.toBeDefined();
  expect(() => clearWidget()).not.toThrow();
});

test("só lê o cache: não existe nenhuma requisição própria do widget (o app desatualizado não dispara /home)", () => {
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "src/lib/widget-sync.ts"), "utf8");
  expect(src).toContain("useCachedHome");
  expect(src).not.toMatch(/useHome\(|fetchHome|apiClient/);
});

test("os TRÊS widgets (médio, Agora e Progresso) recebem a mesma timeline", async () => {
  mockHome.data = { home: home(2) };
  await renderHook(() => useWidgetSync());
  for (const m of [mockUpdate, mockUpdateAgora, mockUpdateProgresso]) expect(m).toHaveBeenCalledTimes(1);
  expect(mockUpdateAgora.mock.calls[0][0]).toEqual(mockUpdate.mock.calls[0][0]);
  expect(mockUpdateProgresso.mock.calls[0][0]).toEqual(mockUpdate.mock.calls[0][0]);
});

test("sair da conta limpa os três widgets", () => {
  clearWidget();
  for (const m of [mockUpdate, mockUpdateAgora, mockUpdateProgresso]) {
    expect((m.mock.calls[0][0] as { props: { status: string } }[])[0].props.status).toBe("signedOut");
  }
});

test("se um widget falhar, os outros ainda são atualizados", async () => {
  mockUpdate.mockImplementation(() => { throw new Error("native"); });
  mockHome.data = { home: home(1) };
  await renderHook(() => useWidgetSync());
  expect(mockUpdateAgora).toHaveBeenCalledTimes(1);
  expect(mockUpdateProgresso).toHaveBeenCalledTimes(1);
});
