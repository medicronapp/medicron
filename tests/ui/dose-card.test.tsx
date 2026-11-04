// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const recordDoseAction = vi.fn(async () => ({ recorded: true }));
vi.mock("@/app/(app)/actions", () => ({ recordDoseAction: (...a: unknown[]) => recordDoseAction(...(a as [])) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), info: vi.fn(), error: vi.fn() } }));

import { DoseCard, type DoseCardProps } from "@/components/dose-card";

const base: DoseCardProps = {
  planId: "p1", scheduledFor: "2026-11-04T23:00:00.000Z", catName: "Izzy", itemName: "Agemoxi",
  dose: "1/2 comprimido", kind: "medication", timeLabel: "20:00", relative: "há 10 min", tone: "overdue",
};

beforeEach(() => recordDoseAction.mockClear());

test("cartão atrasado mostra status em texto, gato, item e dose", () => {
  render(<DoseCard {...base} />);
  expect(screen.getByText("Atrasada")).toBeInTheDocument();
  expect(screen.getByText("Izzy")).toBeInTheDocument();
  expect(screen.getByText(/Agemoxi/)).toBeInTheDocument();
  expect(screen.getByText(/1\/2 comprimido/)).toBeInTheDocument();
  expect(screen.getByText("há 10 min")).toBeInTheDocument();
});

test("medicação: Feito registra direto como done", async () => {
  render(<DoseCard {...base} />);
  await userEvent.click(screen.getByRole("button", { name: /Feito/ }));
  expect(recordDoseAction).toHaveBeenCalledWith({ planId: "p1", scheduledFor: base.scheduledFor, outcome: "done" });
});

test("Pular registra como skipped", async () => {
  render(<DoseCard {...base} />);
  await userEvent.click(screen.getByRole("button", { name: /Pular/ }));
  expect(recordDoseAction).toHaveBeenCalledWith({ planId: "p1", scheduledFor: base.scheduledFor, outcome: "skipped" });
});

test("procedimento: Feito abre a gaveta com Valor e só registra ao confirmar", async () => {
  render(<DoseCard {...base} kind="procedure" itemName="Medir temperatura" dose={null} />);
  await userEvent.click(screen.getByRole("button", { name: /Feito/ }));
  expect(recordDoseAction).not.toHaveBeenCalled();
  await userEvent.type(await screen.findByLabelText("Valor"), "38,7 °C");
  await userEvent.click(screen.getByRole("button", { name: "Confirmar" }));
  expect(recordDoseAction).toHaveBeenCalledWith(
    expect.objectContaining({ planId: "p1", outcome: "done", value: "38,7 °C" }),
  );
});

test("cartão de próxima dose não oferece Feito/Pular", () => {
  render(<DoseCard {...base} tone="upcoming" />);
  expect(screen.queryByRole("button", { name: /Feito/ })).toBeNull();
  expect(screen.getByText("Próxima")).toBeInTheDocument();
});
