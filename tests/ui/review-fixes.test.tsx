// @vitest-environment jsdom
import { test, expect, vi, beforeEach } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { renderToString } from "react-dom/server";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const h = vi.hoisted(() => ({
  setTheme: vi.fn(),
  cancelInvitation: vi.fn(),
  signOut: vi.fn(async () => ({})),
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "dark", setTheme: h.setTheme }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }), usePathname: () => "/" }));
vi.mock("sonner", () => ({ toast: h.toast }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { signOut: h.signOut, organization: { cancelInvitation: h.cancelInvitation } },
}));

import { AppearanceCard } from "@/components/appearance-card";
import { InvitationRow } from "@/components/invitation-row";
import { ErrorView } from "@/components/error-view";
import { ConfirmAction } from "@/components/confirm-action";
import { SegmentedLinks } from "@/components/segmented-links";
import { UserMenu } from "@/components/app-shell/user-menu";
import { unsubscribePush } from "@/lib/push/client";

beforeEach(() => {
  vi.clearAllMocks();
});

// I1 — telas de erro
test("ErrorView tem h1, descrição em português e chama retry ao tentar de novo", async () => {
  const retry = vi.fn();
  render(<ErrorView retry={retry} />);
  expect(screen.getByRole("heading", { level: 1, name: "Algo deu errado" })).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Tentar de novo" }));
  expect(retry).toHaveBeenCalledTimes(1);
});

test("há error.tsx na raiz, global-error.tsx e not-found.tsx, e o error do (app) usa retry", () => {
  for (const f of ["src/app/error.tsx", "src/app/global-error.tsx", "src/app/not-found.tsx"]) {
    expect(existsSync(f), f).toBe(true);
  }
  const appError = readFileSync("src/app/(app)/error.tsx", "utf8");
  expect(appError).toContain("retry");
  expect(appError).not.toMatch(/\breset\b/);
});

// I2 — hidratação do tema
test("AppearanceCard não marca nenhuma opção no render do servidor (evita hydration mismatch)", () => {
  const html = renderToString(<AppearanceCard />);
  expect(html).not.toMatch(/checked/);
});

test("AppearanceCard marca a opção do tema depois de montar", () => {
  render(<AppearanceCard />);
  expect(screen.getByRole("radio", { name: "Escuro" })).toBeChecked();
});

// I3 — Sair remove a inscrição de push deste aparelho
test("unsubscribePush apaga a inscrição no servidor e cancela no navegador", async () => {
  const unsubscribe = vi.fn(async () => true);
  const sub = { endpoint: "https://push/abc", unsubscribe };
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => sub } }) },
  });
  const fetchMock = vi.fn(async () => new Response("{}"));
  vi.stubGlobal("fetch", fetchMock);
  await unsubscribePush();
  expect(fetchMock).toHaveBeenCalledWith("/api/push/subscribe", expect.objectContaining({ method: "DELETE", body: JSON.stringify({ endpoint: "https://push/abc" }) }));
  expect(unsubscribe).toHaveBeenCalled();
  vi.unstubAllGlobals();
});

test("unsubscribePush não falha quando o navegador não tem service worker", async () => {
  Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: undefined });
  await expect(unsubscribePush()).resolves.toBeUndefined();
});

test("Sair cancela o push antes de encerrar a sessão", async () => {
  const order: string[] = [];
  const unsubscribe = vi.fn(async () => { order.push("unsubscribe"); return true; });
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: { getRegistration: async () => ({ pushManager: { getSubscription: async () => ({ endpoint: "https://p/1", unsubscribe }) } }) },
  });
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}")));
  h.signOut.mockImplementation(async () => { order.push("signOut"); return {}; });
  render(<UserMenu name="Ana" email="a@x.com" />);
  await userEvent.click(screen.getByRole("button", { name: "Menu do usuário" }));
  await userEvent.click(await screen.findByRole("menuitem", { name: /Sair/ }));
  await vi.waitFor(() => expect(order).toEqual(["unsubscribe", "signOut"]));
  vi.unstubAllGlobals();
});

// I4 — teclado virtual na gaveta
test("a gaveta do procedimento usa o VirtualKeyboardProvider do Base UI", () => {
  expect(readFileSync("src/components/dose-card.tsx", "utf8")).toContain("VirtualKeyboardProvider");
});

// I5 — alvos de toque de 44px
test("alvos de toque ≥ 44px: segmented, menu do usuário, diálogo e botão Encerrar", async () => {
  render(<SegmentedLinks label="x" items={[{ href: "/a", label: "A", active: true }]} />);
  expect(screen.getByRole("link", { name: "A" }).className).toContain("h-11");
  render(<UserMenu name="Ana" email="a@x.com" />);
  const trigger = screen.getByRole("button", { name: "Menu do usuário" });
  expect(trigger.className).toContain("size-11");
  await userEvent.click(trigger);
  expect((await screen.findByRole("menuitem", { name: /Minha conta/ })).className).toContain("h-11");
  expect(readFileSync("src/components/ui/dialog.tsx", "utf8")).toContain('size="icon"');
  expect(readFileSync("src/app/(app)/gatos/[id]/page.tsx", "utf8")).not.toContain('triggerSize="sm"');
});

// Texto em inglês na UI
test("diálogo e toaster não expõem texto em inglês", async () => {
  render(<ConfirmAction triggerLabel="Abrir" title="T" description="D" confirmLabel="OK" action={async () => {}} />);
  await userEvent.click(screen.getByRole("button", { name: "Abrir" }));
  expect(await screen.findByRole("button", { name: "Fechar" })).toBeInTheDocument();
  expect(readFileSync("src/components/ui/dialog.tsx", "utf8")).not.toContain(">Close<");
  expect(readFileSync("src/app/(app)/layout.tsx", "utf8")).not.toContain("closeButton");
});

// Cancelar convite: falha não pode virar "sucesso"
test("cancelar convite com erro mostra toast de erro, não de sucesso", async () => {
  h.cancelInvitation.mockResolvedValueOnce({ error: { message: "falhou" } });
  render(<InvitationRow id="i1" email="a@x.com" />);
  await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
  await userEvent.click(await screen.findByRole("button", { name: "Cancelar convite" }));
  await vi.waitFor(() => expect(h.toast.error).toHaveBeenCalled());
  expect(h.toast.success).not.toHaveBeenCalled();
});
