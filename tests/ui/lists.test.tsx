// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({ usePathname: () => "/itens", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

import { SegmentedLinks } from "@/components/segmented-links";
import { PatientCard } from "@/components/patient-card";
import { ItemCard } from "@/components/item-card";
import { PlanForm } from "@/components/plan-form";
import { ConfirmAction } from "@/components/confirm-action";
import type { Patient, Item } from "@/lib/db/schema";

const longName = "N".repeat(60);
const patient = { id: "c1", organizationId: "o", name: longName, birthDate: null, weightKg: "4.2", notes: null, archivedAt: null, createdAt: new Date() } as Patient;
const mkItem = (over: Partial<Item>): Item =>
  ({ id: "i1", organizationId: "o", name: "Amoxicilina", kind: "medication", defaultDose: "1 comprimido", notes: null, archivedAt: null, createdAt: new Date(), ...over }) as Item;

test("SegmentedLinks marca só o ativo com aria-current", () => {
  render(<SegmentedLinks label="Tipo" items={[{ href: "/itens?tipo=medication", label: "Medicações", active: true }, { href: "/itens?tipo=procedure", label: "Procedimentos", active: false }]} />);
  expect(screen.getByRole("link", { name: "Medicações" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Procedimentos" })).not.toHaveAttribute("aria-current");
  expect(screen.getByRole("navigation", { name: "Tipo" })).toBeInTheDocument();
});

test("PatientCard com nome de 60 caracteres trunca e mostra iniciais e peso", () => {
  render(<PatientCard patient={patient} />);
  expect(screen.getByText(longName).className).toContain("truncate");
  expect(screen.getByRole("link")).toHaveAttribute("href", "/pacientes/c1");
  expect(screen.getByText("N")).toBeInTheDocument();
  expect(screen.getByText(/4,2 kg/)).toBeInTheDocument();
});

test("ItemCard trunca nome longo e mostra o tipo", () => {
  const name = "M".repeat(80);
  render(<ItemCard item={mkItem({ name, kind: "procedure", defaultDose: null })} />);
  expect(screen.getByText(name).className).toContain("truncate");
  expect(screen.getByText("Procedimento")).toBeInTheDocument();
  expect(screen.getByRole("link")).toHaveAttribute("href", "/itens/i1");
});

test("PlanForm oferece as 8 frequências + personalizada e agrupa itens por tipo", () => {
  const items = [mkItem({ id: "a", name: "Amoxi" }), mkItem({ id: "b", name: "Temperatura", kind: "procedure" })];
  render(<PlanForm items={items} defaultAnchor="2026-11-04T20:00" action={async () => {}} />);
  const freq = screen.getByLabelText("Frequência");
  expect(within(freq).getAllByRole("option")).toHaveLength(9);
  const itemSelect = screen.getByLabelText("Medicação ou procedimento");
  expect(within(itemSelect).getByRole("group", { name: "Medicações" })).toBeInTheDocument();
  expect(within(itemSelect).getByRole("group", { name: "Procedimentos" })).toBeInTheDocument();
  expect(screen.getByLabelText("Horário da primeira dose")).toHaveValue("2026-11-04T20:00");
});

test("ConfirmAction só dispara a action depois de confirmar no diálogo", async () => {
  const action = vi.fn(async () => {});
  render(<ConfirmAction triggerLabel="Arquivar gato" title="Arquivar Mimi?" description="Ela some da lista." confirmLabel="Arquivar" action={action} />);
  expect(screen.queryByText("Arquivar Mimi?")).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Arquivar gato" }));
  expect(await screen.findByText("Arquivar Mimi?")).toBeInTheDocument();
  expect(action).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole("button", { name: "Arquivar" }));
  expect(action).toHaveBeenCalledTimes(1);
});
