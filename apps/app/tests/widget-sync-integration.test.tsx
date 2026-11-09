import type { ReactNode } from "react";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { render, renderHook, waitFor } from "@testing-library/react-native";
import type { HomeDto } from "@medicron/shared";
import { queryClient } from "@/lib/api/query";
import { HOME_KEY } from "@/lib/home-queries";

const mockUpdate = jest.fn();
jest.mock("@/widgets/medicron-widget", () => ({ __esModule: true, default: { updateTimeline: (...a: unknown[]) => mockUpdate(...a) } }));
jest.mock("@/lib/session", () => ({ useAppSession: () => ({ status: "signedIn" }) }));

import { useWidgetSync } from "@/lib/widget-sync";

const HOUR = 3_600_000;
const home = (names: string[]): { home: HomeDto } => ({
  home: {
    now: new Date().toISOString(), todayKey: new Date(Date.now() - 3 * HOUR).toISOString().slice(0, 10), selectedKey: "", selectedStatus: "open",
    streak: { days: 0, atRisk: false, pendingKeys: [] }, week: [], progress: { resolved: 0, total: names.length }, closedToday: false, attention: [],
    patients: [{ patientId: "p", patientName: "Mel", total: names.length, resolved: 0, missed: 0, entries: names.map((n, i) => ({
      planId: n, scheduledFor: new Date(Date.now() + (2 + i) * HOUR).toISOString(), patientId: "p", patientName: "Mel", itemName: n, kind: "medication" as const,
      dose: null, reschedule: false, state: "later" as const, resolvedBy: null, resolvedAt: null, late: false, value: null, note: null,
    })) }],
  },
});

afterEach(() => { queryClient.clear(); jest.clearAllMocks(); });

// Como no app: o Gate (useWidgetSync) é PAI da tela Hoje (observador com queryFn de verdade), então o efeito do pai roda
// depois do do filho. Registrar uma dose invalida a Hoje; isso tem que buscar de novo e o widget receber a lista nova.
const mockFetch = jest.fn();
const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
const KEY = [...HOME_KEY, "today"];
function Hoje() {
  useQuery({ queryKey: KEY, queryFn: () => mockFetch() });
  return null;
}
function Sync() {
  useWidgetSync();
  return null;
}
// O efeito do observador que monta por ÚLTIMO é o que fica nas opções da consulta: aqui o do widget vem depois da Hoje.
function Gate() {
  return (
    <>
      <Hoje />
      <Sync />
    </>
  );
}

test("invalidar a Hoje (dose registrada) refaz a busca sem erro e o widget recebe a lista nova", async () => {
  mockFetch.mockResolvedValueOnce(home(["R1", "R2"])).mockResolvedValueOnce(home(["R2"]));
  await render(<Gate />, { wrapper });
  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(1));
  expect((mockUpdate.mock.calls[0][0] as { props: { upcoming: unknown[] } }[])[0].props.upcoming).toHaveLength(2);

  await queryClient.invalidateQueries({ queryKey: HOME_KEY });

  await waitFor(() => expect(mockUpdate).toHaveBeenCalledTimes(2));
  const state = queryClient.getQueryState(KEY);
  expect(state?.status).toBe("success"); // com o skipToken na mesma chave virava erro "Missing queryFn"
  expect(state?.error).toBeNull();
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect((mockUpdate.mock.calls[1][0] as { props: { upcoming: unknown[] } }[])[0].props.upcoming).toHaveLength(1);
});

test("o widget nunca busca por conta própria (sem a Hoje montada, nada é requisitado)", async () => {
  await renderHook(() => useWidgetSync(), { wrapper });
  expect(mockFetch).not.toHaveBeenCalled();
  expect(mockUpdate).not.toHaveBeenCalled();
});

test("o código não cria observador da Hoje no widget (nada de skipToken na chave da Hoje)", () => {
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "..", "src/lib/home-queries.ts"), "utf8");
  expect(src).not.toContain("skipToken");
  expect(src).toContain("getQueryCache().subscribe");
});
