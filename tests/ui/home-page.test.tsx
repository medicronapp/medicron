// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@/app/(app)/actions", () => ({ recordDoseAction: vi.fn(async () => ({ recorded: true })) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { HomeView } from "@/components/home/home-view";
import type { SHome } from "@/components/home/serialize";

const home: SHome = {
  now: "2026-11-04T23:05:00.000Z", todayKey: "2026-11-04", selectedKey: "2026-11-04", selectedStatus: "open",
  streak: { days: 3, atRisk: true, pendingKeys: ["2026-11-03"] },
  week: [
    { key: "2026-11-02", status: "ok", isToday: false }, { key: "2026-11-03", status: "pending", isToday: false },
    { key: "2026-11-04", status: "open", isToday: true }, { key: "2026-11-05", status: "future", isToday: false },
    { key: "2026-11-06", status: "future", isToday: false }, { key: "2026-11-07", status: "future", isToday: false },
    { key: "2026-11-08", status: "future", isToday: false },
  ],
  progress: { resolved: 1, total: 3 }, closedToday: false,
  attention: [{
    planId: "p1", scheduledFor: "2026-11-03T23:00:00.000Z", patientId: "c1", patientName: "Izzy", itemName: "Amoxicilina",
    kind: "medication", dose: null, reschedule: false, state: "missed", resolvedBy: null, resolvedAt: null, late: false, value: null, note: null,
  }],
  patients: [{ patientId: "c1", patientName: "Izzy", total: 3, resolved: 1, missed: 1, entries: [{
    planId: "p1", scheduledFor: "2026-11-04T11:00:00.000Z", patientId: "c1", patientName: "Izzy", itemName: "Amoxicilina",
    kind: "medication", dose: null, reschedule: false, state: "done", resolvedBy: "Ana", resolvedAt: "2026-11-04T11:03:00.000Z", late: false, value: null, note: null,
  }] }],
};

test("ordem: sequência, atenção e linha do dia; sem 'Próximas 24 horas' nem 'Últimos registros'", () => {
  const { container } = render(<HomeView home={home} hasPatients />);
  const text = container.textContent ?? "";
  const a = text.indexOf("3 dias seguidos em dia");
  const b = text.indexOf("Precisa de atenção");
  const c = text.indexOf("Linha do dia");
  expect(a).toBeGreaterThanOrEqual(0);
  expect(b).toBeGreaterThan(a);
  expect(c).toBeGreaterThan(b);
  expect(text).not.toContain("Próximas 24 horas");
  expect(text).not.toContain("Últimos registros");
});

test("aviso de risco usa a quantidade de pendências de ontem na atenção", () => {
  const { container } = render(<HomeView home={home} hasPatients />);
  expect(container.textContent).toContain("Ontem tem 1 dose sem registro");
});

test("sem pacientes mostra o convite para cadastrar e não mostra sequência", () => {
  const { container } = render(<HomeView home={{ ...home, attention: [], patients: [] }} hasPatients={false} />);
  expect(container.textContent).toContain("Comece cadastrando seu primeiro paciente");
  expect(container.textContent).not.toContain("dias seguidos em dia");
});
