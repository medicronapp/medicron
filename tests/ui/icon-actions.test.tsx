// @vitest-environment jsdom
import { expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Archive } from "lucide-react";

vi.mock("@/app/(app)/gatos/[id]/rotina/actions", () => ({ updatePlanAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ConfirmAction } from "@/components/confirm-action";
import { EditPlanSheet } from "@/components/edit-plan-sheet";

test("ConfirmAction com ícone vira botão só de ícone, com nome acessível e alvo de 44px", async () => {
  render(
    <ConfirmAction
      triggerLabel="Encerrar" triggerIcon={<Archive aria-hidden />} title="T" description="D"
      confirmLabel="Encerrar rotina" action={async () => {}}
    />,
  );
  const btn = screen.getByRole("button", { name: "Encerrar" });
  expect(btn.textContent).toBe("");
  expect(btn.className).toContain("size-11");
  await userEvent.click(btn);
  expect(await screen.findByRole("button", { name: "Encerrar rotina" })).toBeInTheDocument();
});

test("Editar rotina é um botão só de ícone com nome acessível e alvo de 44px", () => {
  render(<EditPlanSheet planId="p1" itemName="Agemoxi" catName="Izzy" dose={null} endAt={null} reschedule={false} />);
  const btn = screen.getByRole("button", { name: "Editar" });
  expect(btn.textContent).toBe("");
  expect(btn.className).toContain("size-11");
});
