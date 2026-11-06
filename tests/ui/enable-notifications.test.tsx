// @vitest-environment jsdom
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/push/client", () => ({ unsubscribePush: vi.fn() }));

import { EnableNotifications } from "@/components/enable-notifications";

beforeEach(() => {
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { register: async () => ({ pushManager: { getSubscription: async () => null } }) },
  });
  vi.stubGlobal("PushManager", class {});
  vi.stubGlobal("Notification", { permission: "default", requestPermission: vi.fn() });
  window.matchMedia = (() => ({ matches: false })) as unknown as typeof window.matchMedia;
});
afterEach(() => vi.unstubAllGlobals());

test("banner de avisos: o botão fica à direita, na mesma linha do texto (sem aumentar a altura)", async () => {
  render(<EnableNotifications compact />);
  const button = await screen.findByRole("button", { name: "Ativar notificações" });
  const row = button.parentElement!;
  expect(row.className).toContain("flex");
  expect(row.className).not.toContain("grid");
  expect(row).toContainElement(screen.getByText("Receba avisos no celular"));
  expect(button.className).toContain("shrink-0");
});
