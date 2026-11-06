// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const updatePlanAction = vi.fn<(planId: string, f: FormData) => Promise<{ error?: string }>>(async () => ({}));
vi.mock("@/app/(app)/pacientes/[id]/rotina/actions", () => ({ updatePlanAction: (planId: string, f: FormData) => updatePlanAction(planId, f) }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

import { EditPlanSheet } from "@/components/edit-plan-sheet";

const props = { planId: "p1", itemName: "Agemoxi", patientName: "Izzy", dose: "1/2 comprimido", endAt: null, reschedule: false };
beforeEach(() => { updatePlanAction.mockClear(); toast.success.mockClear(); toast.error.mockClear(); });

test("Editar abre o sheet com os valores atuais e salva a reprogramação", async () => {
  render(<EditPlanSheet {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /Editar/ }));
  expect(await screen.findByLabelText("Dose / instrução")).toHaveValue("1/2 comprimido");
  await userEvent.click(screen.getByRole("switch", { name: "Reprogramar horários" }));
  await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
  expect(updatePlanAction).toHaveBeenCalledTimes(1);
  const [planId, form] = updatePlanAction.mock.calls[0];
  expect(planId).toBe("p1");
  expect(form.get("reschedule")).toBe("on");
  expect(form.get("dose")).toBe("1/2 comprimido");
});

test("erro do servidor aparece como aviso e o sheet continua aberto", async () => {
  updatePlanAction.mockResolvedValueOnce({ error: "A data final é anterior à próxima dose" });
  render(<EditPlanSheet {...props} />);
  await userEvent.click(screen.getByRole("button", { name: /Editar/ }));
  await userEvent.click(await screen.findByRole("button", { name: "Salvar" }));
  expect(toast.error).toHaveBeenCalledWith("A data final é anterior à próxima dose");
  expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
});
