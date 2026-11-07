// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const setTheme = vi.fn();
vi.mock("next-themes", () => ({ useTheme: () => ({ theme: "light", setTheme }), ThemeProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/auth-client", () => ({
  authClient: { organization: { cancelInvitation: vi.fn(async () => ({})), inviteMember: vi.fn() } },
}));

import { AppearanceCard } from "@/components/appearance-card";
import { InvitationRow } from "@/components/invitation-row";
import { MemberRow } from "@/components/member-row";

test("Aparência: escolher Escuro chama setTheme('dark') e marca a opção atual", async () => {
  render(<AppearanceCard />);
  expect(screen.getByRole("radio", { name: "Claro" })).toBeChecked();
  await userEvent.click(screen.getByRole("radio", { name: "Escuro" }));
  expect(setTheme).toHaveBeenCalledWith("dark");
});

test("InvitationRow com e-mail de 80 caracteres mantém os dois botões acessíveis", () => {
  const email = `${"a".repeat(68)}@exemplo.com`;
  render(<InvitationRow id="inv1" email={email} />);
  expect(screen.getByText(email).className).toContain("truncate");
  expect(screen.getByRole("button", { name: "Copiar link" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  expect(screen.getByText("Pendente")).toBeInTheDocument();
});

test("MemberRow mostra iniciais, papel em português e trunca e-mail longo", () => {
  const email = `${"b".repeat(70)}@exemplo.com`;
  render(<MemberRow name="Ana Paula" email={email} role="admin" />);
  expect(screen.getByText("AP")).toBeInTheDocument();
  expect(screen.getByText("Administrador")).toBeInTheDocument();
  expect(screen.getByText(email).className).toContain("truncate");
});
