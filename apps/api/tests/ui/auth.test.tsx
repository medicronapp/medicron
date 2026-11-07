// @vitest-environment jsdom
import { test, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  useSearchParams: () => new URLSearchParams("next=/convite/abc"),
}));
vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { email: vi.fn(async () => ({ error: { message: "x" } })) },
    signUp: { email: vi.fn(async () => ({ error: null })) },
    organization: { create: vi.fn(async () => ({ data: { id: "o" } })) },
  },
}));

import { PasswordInput } from "@/components/password-input";
import EntrarPage from "@/app/(auth)/entrar/page";
import CadastrarPage from "@/app/(auth)/cadastrar/page";

test("PasswordInput alterna entre oculto e visível", async () => {
  render(<PasswordInput aria-label="Senha" />);
  const input = screen.getByLabelText("Senha");
  expect(input).toHaveAttribute("type", "password");
  const toggle = screen.getByRole("button", { name: "Mostrar senha" });
  expect(toggle).toHaveAttribute("aria-pressed", "false");
  await userEvent.click(toggle);
  expect(input).toHaveAttribute("type", "text");
  expect(screen.getByRole("button", { name: "Ocultar senha" })).toHaveAttribute("aria-pressed", "true");
});

test("tela de entrar tem campos rotulados e link de cadastro preservando next", () => {
  render(<EntrarPage />);
  expect(screen.getByLabelText("E-mail")).toBeInTheDocument();
  expect(screen.getByLabelText("Senha")).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Entrar" })).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastrar?next=%2Fconvite%2Fabc");
});

test("login com erro mostra alerta em português", async () => {
  render(<EntrarPage />);
  await userEvent.type(screen.getByLabelText("E-mail"), "a@x.com");
  await userEvent.type(screen.getByLabelText("Senha"), "12345678");
  await userEvent.click(screen.getByRole("button", { name: "Entrar" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("E-mail ou senha incorretos.");
});

test("tela de cadastro tem nome, e-mail e senha", () => {
  render(<CadastrarPage />);
  for (const label of ["Seu nome", "E-mail", "Senha"]) expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
  expect(screen.getByRole("heading", { level: 1, name: "Criar conta" })).toBeInTheDocument();
});
