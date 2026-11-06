// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const completeWelcomeAction = vi.fn(async () => undefined);
const dismissChecklistAction = vi.fn(async () => undefined);
vi.mock("@/app/(app)/actions", () => ({
  completeWelcomeAction: () => completeWelcomeAction(),
  dismissChecklistAction: () => dismissChecklistAction(),
}));

import { FirstStepsCard } from "@/components/home/first-steps-card";
import { WelcomeSheet } from "@/components/home/welcome-sheet";

beforeEach(() => { completeWelcomeAction.mockClear(); dismissChecklistAction.mockClear(); });

test("boas-vindas: abre no primeiro slide e avança com Próximo até o último", async () => {
  render(<WelcomeSheet />);
  expect(await screen.findByText("Bem-vindo ao Medicron")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
  expect(screen.getByText("Cadastre pacientes e itens")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
  expect(screen.getByText("Monte a rotina")).toBeInTheDocument();
  await userEvent.click(screen.getByRole("button", { name: "Próximo" }));
  expect(screen.getByText("Marque como feito")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Próximo" })).toBeNull();
  expect(completeWelcomeAction).not.toHaveBeenCalled();
});

test("boas-vindas: Concluir e começar registra que viu e fecha", async () => {
  render(<WelcomeSheet />);
  for (let i = 0; i < 3; i++) await userEvent.click(await screen.findByRole("button", { name: "Próximo" }));
  await userEvent.click(screen.getByRole("button", { name: "Concluir e começar" }));
  expect(completeWelcomeAction).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(screen.queryByText("Marque como feito")).toBeNull());
});

test("boas-vindas: Pular também registra que viu, para não aparecer de novo", async () => {
  render(<WelcomeSheet />);
  await userEvent.click(await screen.findByRole("button", { name: "Pular" }));
  expect(completeWelcomeAction).toHaveBeenCalledTimes(1);
});

const steps = { patient: true, item: false, plan: false, push: false };

test("primeiros passos: mostra o progresso e leva cada passo pendente à tela certa", () => {
  render(<FirstStepsCard steps={steps} />);
  expect(screen.getByText("1/4")).toBeInTheDocument();
  expect(screen.getByText("Cadastrar um paciente").closest("a")).toBeNull();
  expect(screen.getByRole("link", { name: "Cadastrar uma medicação ou procedimento" })).toHaveAttribute("href", "/itens/novo");
  expect(screen.getByRole("link", { name: "Montar a rotina" })).toHaveAttribute("href", "/pacientes");
  expect(screen.getByRole("link", { name: "Ativar os avisos no celular" })).toHaveAttribute("href", "/conta");
});

test("primeiros passos: Dispensar registra e some com o card", async () => {
  render(<FirstStepsCard steps={steps} />);
  await userEvent.click(screen.getByRole("button", { name: "Dispensar" }));
  expect(dismissChecklistAction).toHaveBeenCalledTimes(1);
  await vi.waitFor(() => expect(screen.queryByText("Primeiros passos")).toBeNull());
});

test("primeiros passos: com tudo feito o botão vira Concluir", async () => {
  render(<FirstStepsCard steps={{ patient: true, item: true, plan: true, push: true }} />);
  expect(screen.getByText("4/4")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Dispensar" })).toBeNull();
  await userEvent.click(screen.getByRole("button", { name: "Concluir" }));
  expect(dismissChecklistAction).toHaveBeenCalledTimes(1);
});
