// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  usePathname: () => "/itens",
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signOut: vi.fn(async () => ({})),
    useListOrganizations: () => ({ data: [{ id: "o1", name: "Casa de Ana" }, { id: "o2", name: "Casa da vovó" }] }),
    organization: { setActive: vi.fn() },
  },
}));

import { isActive, NAV_ITEMS } from "@/components/app-shell/nav-items";
import { BottomNav } from "@/components/app-shell/bottom-nav";
import { UserMenu } from "@/components/app-shell/user-menu";
import { OrgSwitcher } from "@/components/app-shell/org-switcher";
import { ThemeProvider } from "@/components/theme-provider";

test("isActive casa por segmento, e '/' só exato", () => {
  expect(isActive("/gatos/abc", "/gatos")).toBe(true);
  expect(isActive("/gatos", "/gatos")).toBe(true);
  expect(isActive("/gatosx", "/gatos")).toBe(false);
  expect(isActive("/", "/")).toBe(true);
  expect(isActive("/gatos", "/")).toBe(false);
});

test("NAV_ITEMS tem Hoje, Gatos, Itens e Conta", () => {
  expect(NAV_ITEMS.map((i) => i.label)).toEqual(["Hoje", "Gatos", "Itens", "Conta"]);
});

test("BottomNav marca só o item da rota atual com aria-current", () => {
  render(<BottomNav />);
  const links = screen.getAllByRole("link");
  expect(links).toHaveLength(4);
  expect(screen.getByRole("link", { name: "Itens" })).toHaveAttribute("aria-current", "page");
  expect(screen.getByRole("link", { name: "Hoje" })).not.toHaveAttribute("aria-current");
});

test("UserMenu aberto oferece Minha conta e Sair", async () => {
  render(<ThemeProvider><UserMenu name="Ana Paula" email="ana@x.com" /></ThemeProvider>);
  await userEvent.click(screen.getByRole("button", { name: "Menu do usuário" }));
  expect(await screen.findByRole("menuitem", { name: /Sair/ })).toBeInTheDocument();
  expect(screen.getByRole("menuitem", { name: /Minha conta/ })).toBeInTheDocument();
});

test("OrgSwitcher mostra o nome da conta ativa", () => {
  render(<OrgSwitcher activeId="o2" />);
  expect(screen.getByRole("button", { name: /Conta ativa/ })).toHaveTextContent("Casa da vovó");
});
