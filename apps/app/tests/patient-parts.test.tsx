import { act, fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { PatientDto } from "@medicron/shared";
import { renderApp } from "./helpers";

jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:00:00.000Z") }));
jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable } = require("react-native");
  return { __esModule: true, default: (p: { mode: string; onChange: (e: unknown, d: Date) => void }) => <Pressable testID={`picker-${p.mode}`} onPress={() => p.onChange({ type: "set" }, new Date(2020, 2, 5, 12, 0))} />, DateTimePickerAndroid: { open: jest.fn() } };
});

import { toast as mockToast } from "@/components/ui/toast";
import { PageHeader } from "@/components/page-header";
import { PatientCard } from "@/components/patient-card";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { PatientForm } from "@/components/patient-form";
import { lastModal } from "./mocks/gorhom-bottom-sheet";

const patient = (o: Partial<PatientDto> = {}): PatientDto => ({
  id: "a", name: "Izzy", species: "cat", birthDate: "2026-05-01", weightKg: "4.20", notes: null, createdAt: "2026-01-01T00:00:00.000Z", ...o,
});

beforeEach(() => jest.clearAllMocks());

describe("PageHeader", () => {
  test("com voltar mostra o botão e chama onBack", async () => {
    const onBack = jest.fn();
    await renderApp(<PageHeader title="Izzy" description="Gato" onBack={onBack} />);
    await fireEvent.press(screen.getByRole("button", { name: "Voltar" }));
    expect(onBack).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Gato")).toBeOnTheScreen();
  });
  test("sem voltar não tem botão; ações aparecem à direita", async () => {
    const { Text } = require("react-native");
    await renderApp(<PageHeader title="Pacientes" actions={<Text>ação</Text>} />);
    expect(screen.queryByRole("button", { name: "Voltar" })).toBeNull();
    expect(screen.getByText("ação")).toBeOnTheScreen();
  });
});

describe("PatientCard", () => {
  test("espécie · idade · peso com vírgula; toque chama onPress", async () => {
    const onPress = jest.fn();
    await renderApp(<PatientCard patient={patient()} onPress={onPress} />);
    expect(screen.getByText("Izzy")).toBeOnTheScreen();
    expect(screen.getByText("Gato · 6 meses · 4,2 kg")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: /Izzy/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  test("sem nascimento nem peso mostra só a espécie", async () => {
    await renderApp(<PatientCard patient={patient({ birthDate: null, weightKg: null, species: "dog" })} onPress={() => {}} />);
    expect(screen.getByText("Cachorro")).toBeOnTheScreen();
  });
});

describe("ConfirmSheet", () => {
  const props = { title: "Arquivar Izzy?", description: "O paciente some das listas.", confirmLabel: "Arquivar" };

  test("mostra título e descrição; confirmar chama uma vez mesmo com dois toques e fecha", async () => {
    let finish: () => void = () => {};
    const onConfirm = jest.fn(() => new Promise<void>((r) => { finish = r; }));
    const onOpenChange = jest.fn();
    await renderApp(<ConfirmSheet open onOpenChange={onOpenChange} onConfirm={onConfirm} {...props} />);
    expect(await screen.findByText("Arquivar Izzy?")).toBeOnTheScreen();
    expect(screen.getByText("O paciente some das listas.")).toBeOnTheScreen();
    const b = screen.getByRole("button", { name: "Arquivar" });
    await fireEvent.press(b);
    await fireEvent.press(b);
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Aguarde…" })).toBeOnTheScreen();
    await act(async () => finish());
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
  });

  test("cancelar fecha sem confirmar", async () => {
    const onConfirm = jest.fn();
    const onOpenChange = jest.fn();
    await renderApp(<ConfirmSheet open onOpenChange={onOpenChange} onConfirm={onConfirm} {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar" }));
    expect(onConfirm).not.toHaveBeenCalled();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  test("erro mantém aberto e avisa", async () => {
    const onOpenChange = jest.fn();
    await renderApp(<ConfirmSheet open onOpenChange={onOpenChange} onConfirm={() => Promise.reject(new Error("falhou"))} {...props} />);
    await fireEvent.press(await screen.findByRole("button", { name: "Arquivar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("falhou"));
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
    expect(screen.getByRole("button", { name: "Arquivar" })).toBeEnabled();
  });
  void lastModal;
});

describe("PatientForm", () => {
  const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
  const pickSpecies = async (name: string) => {
    await fireEvent.press(screen.getByRole("button", { name: "Tipo" }));
    await fireEvent.press(await screen.findByRole("button", { name }));
  };

  test("o tipo é escolhido em cartões com ícone", async () => {
    await renderApp(<PatientForm onSubmit={async () => {}} />);
    await fireEvent.press(screen.getByRole("button", { name: "Tipo" }));
    expect(await screen.findByTestId("cards-grid")).toBeOnTheScreen();
    for (const l of ["Gato", "Cachorro", "Pessoa", "Outro"]) expect(screen.getByRole("button", { name: l })).toBeOnTheScreen();
  });

  test("nome e tipo: envia só o que foi preenchido", async () => {
    const onSubmit = jest.fn(async (_b: unknown) => {});
    await renderApp(<PatientForm onSubmit={onSubmit} />);
    await type("Nome", "  Izzy ");
    await pickSpecies("Gato");
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Izzy", species: "cat" }));
  });

  test("peso com vírgula vira número, nascimento e observações vão no corpo", async () => {
    const onSubmit = jest.fn(async (_b: unknown) => {});
    await renderApp(<PatientForm onSubmit={onSubmit} />);
    await type("Nome", "Izzy");
    await pickSpecies("Gato");
    await type("Peso (kg)", "4,2");
    await type("Observações", " alergia a dipirona ");
    await fireEvent.press(screen.getByRole("button", { name: "Selecionar" }));
    await fireEvent.press(screen.getByTestId("picker-date"));
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ name: "Izzy", species: "cat", weightKg: 4.2, birthDate: "2020-03-05", notes: "alergia a dipirona" });
  });

  test.each(["abc", "0", "-1", "501"])("peso '%s' mostra 'Peso inválido' e não envia", async (w) => {
    const onSubmit = jest.fn();
    await renderApp(<PatientForm onSubmit={onSubmit} />);
    await type("Nome", "Izzy");
    await pickSpecies("Gato");
    await type("Peso (kg)", w);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Peso inválido")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("nome em branco e tipo vazio mostram os erros", async () => {
    const onSubmit = jest.fn();
    await renderApp(<PatientForm onSubmit={onSubmit} />);
    await fireEvent.press(screen.getByRole("button", { name: "Salvar" }));
    expect(await screen.findByText("Informe o nome")).toBeOnTheScreen();
    expect(screen.getByText("Selecione o tipo")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("campos agrupados em seções em cartão, como na nova rotina", async () => {
    await renderApp(<PatientForm onSubmit={async () => {}} />);
    expect(screen.getByText("Quem é")).toBeOnTheScreen();
    expect(screen.getByText("Detalhes")).toBeOnTheScreen();
  });

  test("dicas do site", async () => {
    await renderApp(<PatientForm onSubmit={async () => {}} />);
    expect(screen.getAllByText("Opcional").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("Opcional: alergias, condições, responsável…")).toBeOnTheScreen();
  });

  test("editar mostra os valores atuais; botão desabilitado durante o envio", async () => {
    await renderApp(<PatientForm patient={patient({ notes: "calma" })} onSubmit={async () => {}} submitting />);
    expect(screen.getByLabelText("Nome").props.value).toBe("Izzy");
    expect(screen.getByLabelText("Peso (kg)").props.value).toBe("4,2");
    expect(screen.getByLabelText("Observações").props.value).toBe("calma");
    expect(screen.getByText("Gato")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});
