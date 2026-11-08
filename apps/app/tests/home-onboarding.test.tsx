import { screen, fireEvent, act } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockDismiss = jest.fn();
const mockWelcome = jest.fn();
jest.mock("@/lib/home-queries", () => ({
  useDismissChecklist: () => ({ mutate: () => mockDismiss() }),
  useCompleteWelcome: () => ({ mutate: () => mockWelcome() }),
}));

import { lastModal } from "./mocks/gorhom-bottom-sheet";
import { FirstStepsCard } from "@/components/home/first-steps-card";
import { WelcomeSheet } from "@/components/home/welcome-sheet";

beforeEach(() => jest.clearAllMocks());

describe("FirstStepsCard", () => {
  const steps = { patient: true, item: true, plan: false, push: false };

  test("progresso 2/4 com barra acessível e 4 passos", async () => {
    await renderApp(<FirstStepsCard steps={steps} onNavigate={() => {}} />);
    expect(screen.getByRole("header", { name: "Primeiros passos" })).toBeOnTheScreen();
    expect(screen.getByText("2/4")).toBeOnTheScreen();
    expect(screen.getByRole("progressbar", { name: "Progresso" })).toHaveAccessibilityValue({ min: 0, max: 4, now: 2 });
    for (const t of ["Cadastrar um paciente", "Cadastrar uma medicação ou procedimento", "Montar a rotina", "Ativar os avisos no celular"]) {
      expect(screen.getByText(t)).toBeOnTheScreen();
    }
  });

  test("passo feito não é toque; passo pendente navega ao destino", async () => {
    const onNavigate = jest.fn();
    await renderApp(<FirstStepsCard steps={steps} onNavigate={onNavigate} />);
    expect(screen.queryByRole("link", { name: "Cadastrar um paciente" })).toBeNull();
    await fireEvent.press(screen.getByRole("link", { name: "Montar a rotina" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/pacientes");
    await fireEvent.press(screen.getByRole("link", { name: "Ativar os avisos no celular" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/conta");
  });

  test("os destinos dos passos: paciente e item", async () => {
    const onNavigate = jest.fn();
    await renderApp(<FirstStepsCard steps={{ patient: false, item: false, plan: false, push: false }} onNavigate={onNavigate} />);
    await fireEvent.press(screen.getByRole("link", { name: "Cadastrar um paciente" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/pacientes/novo");
    await fireEvent.press(screen.getByRole("link", { name: "Cadastrar uma medicação ou procedimento" }));
    expect(onNavigate).toHaveBeenLastCalledWith("/itens/novo");
  });

  test("Dispensar esconde na hora e avisa a API uma vez", async () => {
    await renderApp(<FirstStepsCard steps={steps} onNavigate={() => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "Dispensar" }));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Primeiros passos")).toBeNull();
  });

  test("com tudo feito o botão é Concluir", async () => {
    await renderApp(<FirstStepsCard steps={{ patient: true, item: true, plan: true, push: true }} onNavigate={() => {}} />);
    expect(screen.queryByRole("button", { name: "Dispensar" })).toBeNull();
    await fireEvent.press(screen.getByRole("button", { name: "Concluir" }));
    expect(mockDismiss).toHaveBeenCalledTimes(1);
  });
});

describe("WelcomeSheet", () => {
  const touch = (x: number) => ({ nativeEvent: { pageX: x, locationX: x }, touches: [{ pageX: x }], changedTouches: [{ pageX: x }] });

  test("slide 1 e avanço até o último, com Voltar e Concluir e começar", async () => {
    await renderApp(<WelcomeSheet />);
    expect(await screen.findByText("Bem-vindo ao Medicron")).toBeOnTheScreen();
    expect(screen.getByLabelText("Passo 1 de 4")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Cadastre pacientes e itens")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Monte a rotina")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Próximo" }));
    expect(screen.getByText("Marque como feito")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Pular" })).toBeNull();
    expect(screen.getByRole("button", { name: "Concluir e começar" })).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(screen.getByText("Monte a rotina")).toBeOnTheScreen();
  });

  test("os pontos levam ao passo escolhido", async () => {
    await renderApp(<WelcomeSheet />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ir para o passo 3" }));
    expect(screen.getByText("Monte a rotina")).toBeOnTheScreen();
  });

  test("deslizar 80 px para a esquerda avança e para a direita volta", async () => {
    await renderApp(<WelcomeSheet />);
    const area = await screen.findByTestId("welcome-slide");
    await fireEvent(area, "touchStart", touch(200));
    await fireEvent(area, "touchEnd", touch(120));
    expect(screen.getByText("Cadastre pacientes e itens")).toBeOnTheScreen();
    await fireEvent(area, "touchStart", touch(100));
    await fireEvent(area, "touchEnd", touch(180));
    expect(screen.getByText("Bem-vindo ao Medicron")).toBeOnTheScreen();
  });

  test("deslizar pouco (30 px) não troca de slide", async () => {
    await renderApp(<WelcomeSheet />);
    const area = await screen.findByTestId("welcome-slide");
    await fireEvent(area, "touchStart", touch(200));
    await fireEvent(area, "touchEnd", touch(170));
    expect(screen.getByText("Bem-vindo ao Medicron")).toBeOnTheScreen();
  });

  test("Pular registra uma vez e fecha", async () => {
    await renderApp(<WelcomeSheet />);
    await fireEvent.press(await screen.findByRole("button", { name: "Pular" }));
    expect(mockWelcome).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Bem-vindo ao Medicron")).toBeNull();
  });

  test("Concluir e começar registra uma vez só (fechar o sheet depois não repete)", async () => {
    await renderApp(<WelcomeSheet />);
    await fireEvent.press(await screen.findByRole("button", { name: "Ir para o passo 4" }));
    await fireEvent.press(screen.getByRole("button", { name: "Concluir e começar" }));
    expect(mockWelcome).toHaveBeenCalledTimes(1);
  });

  test("fechar o sheet (arrastar ou tocar fora) registra uma vez", async () => {
    await renderApp(<WelcomeSheet />);
    await screen.findByText("Bem-vindo ao Medicron");
    await act(async () => lastModal.userDismiss());
    expect(mockWelcome).toHaveBeenCalledTimes(1);
  });
});
