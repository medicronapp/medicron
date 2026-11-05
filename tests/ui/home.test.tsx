// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const recordDoseAction = vi.fn<(input: unknown) => Promise<{ recorded: boolean; reason?: string }>>(async () => ({ recorded: true }));
vi.mock("@/app/(app)/actions", () => ({ recordDoseAction: (input: unknown) => recordDoseAction(input) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { StreakCard } from "@/components/home/streak-card";
import { AttentionList } from "@/components/home/attention-list";
import { DayTimeline } from "@/components/home/day-timeline";
import type { SEntry, SCatDay } from "@/components/home/serialize";

beforeEach(() => recordDoseAction.mockClear());

const week = [
  { key: "2026-11-02", status: "ok", isToday: false },
  { key: "2026-11-03", status: "lost", isToday: false },
  { key: "2026-11-04", status: "open", isToday: true },
  { key: "2026-11-05", status: "future", isToday: false },
  { key: "2026-11-06", status: "future", isToday: false },
  { key: "2026-11-07", status: "future", isToday: false },
  { key: "2026-11-08", status: "future", isToday: false },
] as const;
const streakProps = {
  streak: { days: 6, atRisk: false, pendingKeys: [] as string[] }, week: [...week],
  progress: { resolved: 5, total: 8 }, closedToday: false, riskCount: 0,
};

test("StreakCard: título, progresso e semana com links só até hoje", () => {
  render(<StreakCard {...streakProps} />);
  expect(screen.getByText("6 dias seguidos em dia")).toBeInTheDocument();
  expect(screen.getByText("5/8")).toBeInTheDocument();
  expect(screen.queryByText("Dia fechado!")).toBeNull();
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(3);
  expect(links[2]).toHaveAttribute("href", "/");
  expect(links[0]).toHaveAttribute("href", "/?dia=2026-11-02");
  expect(screen.getByRole("link", { name: /terça.*sem solução/i })).toBeInTheDocument();
});

test("StreakCard: singular, zero, dia fechado e aviso de risco", () => {
  const { rerender } = render(<StreakCard {...streakProps} streak={{ days: 1, atRisk: false, pendingKeys: [] }} />);
  expect(screen.getByText("1 dia em dia")).toBeInTheDocument();
  rerender(<StreakCard {...streakProps} streak={{ days: 0, atRisk: false, pendingKeys: [] }} />);
  expect(screen.getByText("Comece sua sequência: feche o dia de hoje")).toBeInTheDocument();
  rerender(<StreakCard {...streakProps} closedToday />);
  expect(screen.getByText("Dia fechado!")).toBeInTheDocument();
  rerender(<StreakCard {...streakProps} streak={{ days: 2, atRisk: true, pendingKeys: ["2026-11-03"] }} riskCount={2} />);
  expect(screen.getByText(/Ontem tem 2 doses sem registro: resolva até hoje 23:59 para manter a sequência/)).toBeInTheDocument();
});

const entry = (over: Partial<SEntry>): SEntry => ({
  planId: "p1", scheduledFor: "2026-11-04T17:00:00.000Z", catId: "c1", catName: "Izzy", itemName: "Amoxicilina",
  kind: "medication", dose: "1/2 comprimido", state: "missed", resolvedBy: null, resolvedAt: null,
  late: false, value: null, note: null, ...over,
});
const NOW = "2026-11-04T23:05:00.000Z";

test("AttentionList mostra 5 e 'Ver todas (7)'; ao clicar mostra as 7", async () => {
  const entries = Array.from({ length: 7 }, (_, i) =>
    entry({ planId: `p${i}`, scheduledFor: `2026-11-04T1${i}:00:00.000Z` }));
  render(<AttentionList entries={entries} now={NOW} />);
  expect(screen.getByRole("heading", { name: /Precisa de atenção · 7/ })).toBeInTheDocument();
  expect(screen.getAllByRole("article")).toHaveLength(5);
  await userEvent.click(screen.getByRole("button", { name: "Ver todas (7)" }));
  expect(screen.getAllByRole("article")).toHaveLength(7);
});

test("AttentionList some quando vazia", () => {
  const { container } = render(<AttentionList entries={[]} now={NOW} />);
  expect(container).toBeEmptyDOMElement();
});

const cats: SCatDay[] = [
  { catId: "c1", catName: "Izzy", total: 4, resolved: 2, missed: 1, entries: [
    entry({ scheduledFor: "2026-11-04T11:00:00.000Z", state: "done", resolvedBy: "Ana", resolvedAt: "2026-11-04T11:03:00.000Z" }),
    entry({ scheduledFor: "2026-11-04T13:00:00.000Z", state: "skipped", itemName: "Medir temperatura", resolvedBy: "Bia", resolvedAt: "2026-11-04T13:10:00.000Z" }),
    entry({ scheduledFor: "2026-11-04T17:00:00.000Z", state: "missed" }),
    entry({ scheduledFor: "2026-11-04T23:00:00.000Z", state: "now", itemName: "Gabapentina" }),
  ] },
  { catId: "c2", catName: "Sir Bigodes", total: 2, resolved: 1, missed: 0, entries: [
    entry({ catId: "c2", catName: "Sir Bigodes", planId: "p9", scheduledFor: "2026-11-04T11:00:00.000Z", state: "done", itemName: "Gaba", late: true }),
    entry({ catId: "c2", catName: "Sir Bigodes", planId: "p9", scheduledFor: "2026-11-05T02:30:00.000Z", state: "later", itemName: "Gaba noite" }),
  ] },
];
const tlProps = { cats, selectedKey: "2026-11-04", todayKey: "2026-11-04", selectedStatus: "open" as const, now: NOW };

test("DayTimeline: uma aba por gato, selo vermelho com pendências e progresso nas demais", () => {
  render(<DayTimeline {...tlProps} />);
  const tabs = screen.getAllByRole("tab");
  expect(tabs).toHaveLength(2);
  expect(tabs[0]).toHaveAttribute("aria-selected", "true");
  expect(within(tabs[0]).getByText("1")).toBeInTheDocument();
  expect(within(tabs[1]).getByText("1/2")).toBeInTheDocument();
});

test("DayTimeline: estados em texto e botões só em 'sem registro' e 'agora'", () => {
  render(<DayTimeline {...tlProps} />);
  for (const label of ["Feito", "Pulado", "Sem registro", "Agora"]) expect(screen.getAllByText(label).length).toBeGreaterThan(0);
  const panel = screen.getByRole("tabpanel");
  expect(within(panel).getAllByRole("button", { name: /^Feito$/ })).toHaveLength(2);
  expect(within(panel).getAllByRole("button", { name: /^Pular$/ })).toHaveLength(2);
});

test("DayTimeline: trocar de aba troca a lista; 'mais tarde' e resolvidos não têm botões; 'registrada depois' aparece", async () => {
  render(<DayTimeline {...tlProps} />);
  await userEvent.click(screen.getByRole("tab", { name: /Sir Bigodes/ }));
  const panel = screen.getByRole("tabpanel");
  expect(within(panel).getByText("Mais tarde")).toBeInTheDocument();
  expect(within(panel).getByText("registrada depois")).toBeInTheDocument();
  expect(within(panel).queryByRole("button", { name: /Feito|Pular/ })).toBeNull();
});

test("DayTimeline: resolver chama a ação com o horário do cuidado", async () => {
  render(<DayTimeline {...tlProps} />);
  const panel = screen.getByRole("tabpanel");
  await userEvent.click(within(panel).getAllByRole("button", { name: /^Feito$/ })[0]);
  expect(recordDoseAction).toHaveBeenCalledWith({ planId: "p1", scheduledFor: "2026-11-04T17:00:00.000Z", outcome: "done" });
});

test("DayTimeline de dia anterior mostra cabeçalho, 'dose sem solução' e link para hoje", () => {
  render(<DayTimeline {...tlProps} selectedKey="2026-11-03" selectedStatus="lost" />);
  expect(screen.getByText("Dia 03/11")).toBeInTheDocument();
  expect(screen.getByText("Dose sem solução")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Voltar para hoje" })).toHaveAttribute("href", "/");
});

test("DayTimeline sem cuidados mostra estado vazio", () => {
  render(<DayTimeline {...tlProps} cats={[]} />);
  expect(screen.getByText("Nenhum cuidado neste dia")).toBeInTheDocument();
});

test("nome longo de item trunca na linha do tempo", () => {
  const long = "M".repeat(80);
  render(<DayTimeline {...tlProps} cats={[{ ...cats[0], entries: [entry({ itemName: long, state: "done" })] }]} />);
  expect(screen.getByText(long).className).toContain("truncate");
});

test("M2: células da semana têm alvo de toque de 44px", () => {
  render(<StreakCard {...streakProps} />);
  for (const link of screen.getAllByRole("link")) expect(link.firstElementChild?.className).toContain("h-11");
});

test("selo de progresso da aba selecionada usa fundo sólido (contraste AA), não branco translúcido", () => {
  render(<DayTimeline {...tlProps} cats={[{ ...cats[1] }]} />);
  const badge = screen.getByText("1/2");
  expect(badge.className).toContain("bg-primary-foreground");
  expect(badge.className).not.toContain("bg-white/20");
});
