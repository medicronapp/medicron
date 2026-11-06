// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setRescheduleAction = vi.fn(async () => undefined);
vi.mock("@/app/(app)/gatos/[id]/rotina/actions", () => ({ setRescheduleAction: (...a: unknown[]) => setRescheduleAction(...(a as [])) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

import { RescheduleToggle } from "@/components/reschedule-toggle";

beforeEach(() => setRescheduleAction.mockClear());

test("alternar o switch salva o novo valor da rotina", async () => {
  render(<RescheduleToggle planId="p1" checked={false} />);
  await userEvent.click(screen.getByRole("switch", { name: "Reprogramar horários" }));
  expect(setRescheduleAction).toHaveBeenCalledWith("p1", true);
});

test("rotina que já reprograma aparece ligada e desliga ao tocar", async () => {
  render(<RescheduleToggle planId="p2" checked />);
  const sw = screen.getByRole("switch", { name: "Reprogramar horários" });
  expect(sw).toBeChecked();
  await userEvent.click(sw);
  expect(setRescheduleAction).toHaveBeenCalledWith("p2", false);
});
