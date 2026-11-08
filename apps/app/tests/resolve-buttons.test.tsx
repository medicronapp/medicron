import { screen, fireEvent, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockRecord = jest.fn();
jest.mock("@/lib/home-queries", () => ({ useRecordDose: () => ({ mutateAsync: (b: unknown) => mockRecord(b) }) }));

jest.mock("@/components/ui/toast", () => ({ toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() }, Toaster: () => null }));

// Relógio fixo: 2026-11-07 12:00 em Brasília (15:00Z).
jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-07T15:00:00.000Z") }));

const mockPick = { h: 7, m: 45 };
// O seletor nativo vira um botão que "escolhe" 07:45 (campos locais do aparelho, como o componente real devolve).
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: (p: { onChange: (e: unknown, d: Date) => void; accessibilityLabel?: string }) => (
      <Pressable testID="time-picker" accessibilityLabel={p.accessibilityLabel} onPress={() => p.onChange({ type: "set" }, new Date(2000, 0, 1, mockPick.h, mockPick.m))}>
        <Text>seletor</Text>
      </Pressable>
    ),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

import { toast as mockToast } from "@/components/ui/toast";
import { ResolveButtons } from "@/components/resolve-buttons";
import { DoseCard } from "@/components/dose-card";

const base = { planId: "p1", scheduledFor: "2026-11-07T11:00:00.000Z", itemName: "Dipirona", patientName: "Izzy" };
const med = { ...base, kind: "medication" as const, reschedule: false };

beforeEach(() => {
  jest.clearAllMocks();
  mockPick.h = 7; mockPick.m = 45;
  mockRecord.mockResolvedValue({ recorded: true });
});

describe("ResolveButtons: medicação simples", () => {
  test("Feito registra direto, sem gaveta", async () => {
    await renderApp(<ResolveButtons {...med} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledWith({ planId: "p1", scheduledFor: base.scheduledFor, outcome: "done" }));
    expect(screen.queryByText("Confirmar")).toBeNull();
    expect(mockToast.success).toHaveBeenCalledWith("Registrado");
  });

  test("Pular registra como pulado", async () => {
    await renderApp(<ResolveButtons {...med} />);
    await fireEvent.press(screen.getByRole("button", { name: "Pular" }));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ outcome: "skipped" })));
    expect(mockToast.success).toHaveBeenCalledWith("Marcado como pulado");
  });

  test("toque duplo rápido registra uma vez só", async () => {
    let release: (v: unknown) => void = () => {};
    mockRecord.mockReturnValue(new Promise((r) => { release = r; }));
    await renderApp(<ResolveButtons {...med} />);
    const feito = screen.getByRole("button", { name: "Feito" });
    await fireEvent.press(feito);
    await fireEvent.press(feito);
    await fireEvent.press(screen.getByRole("button", { name: "Pular" }));
    expect(mockRecord).toHaveBeenCalledTimes(1);
    release({ recorded: true });
    await waitFor(() => expect(screen.getByRole("button", { name: "Feito" })).toBeEnabled());
  });

  test.each([
    [{ recorded: false, reason: "too-early" }, "info", "Este cuidado ainda não está na hora."],
    [{ recorded: false, reason: "already" }, "info", "Este horário já tinha sido registrado por outra pessoa."],
  ])("resposta %j avisa", async (reply, kind, text) => {
    mockRecord.mockResolvedValue(reply);
    await renderApp(<ResolveButtons {...med} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await waitFor(() => expect(mockToast[kind as "info"]).toHaveBeenCalledWith(text));
  });
});

describe("ResolveButtons: procedimento", () => {
  const proc = { ...base, kind: "procedure" as const, reschedule: false, itemName: "Temperatura" };

  test("Feito abre a gaveta; valor e observação seguem no envio", async () => {
    await renderApp(<ResolveButtons {...proc} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    expect(await screen.findByText("Izzy · registre o resultado, se quiser.")).toBeOnTheScreen();
    expect(mockRecord).not.toHaveBeenCalled();
    await fireEvent.changeText(screen.getByLabelText("Valor"), "38,7 °C");
    await fireEvent.changeText(screen.getByLabelText("Observação"), "após o banho");
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ outcome: "done", value: "38,7 °C", note: "após o banho" })));
  });

  test("valor e observação em branco não vão no corpo", async () => {
    await renderApp(<ResolveButtons {...proc} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockRecord).toHaveBeenCalled());
    const body = mockRecord.mock.calls[0][0] as Record<string, unknown>;
    expect(body).not.toHaveProperty("value");
    expect(body).not.toHaveProperty("note");
  });

  test("Cancelar fecha sem enviar", async () => {
    await renderApp(<ResolveButtons {...proc} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Cancelar" }));
    expect(mockRecord).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Confirmar")).toBeNull());
  });
});

describe("ResolveButtons: reprogramar (hora da aplicação)", () => {
  const re = { ...med, reschedule: true };

  test("mostra o campo de hora e envia appliedAt (07:45 de Brasília = 10:45Z)", async () => {
    await renderApp(<ResolveButtons {...re} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    expect(await screen.findByText("Ajuste se a aplicação foi antes de você marcar.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByTestId("time-picker"));
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ appliedAt: "2026-11-07T10:45:00.000Z" })));
  });

  test("sem mexer na hora, usa a hora de agora (12:00 de Brasília)", async () => {
    await renderApp(<ResolveButtons {...re} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockRecord).toHaveBeenCalledWith(expect.objectContaining({ appliedAt: "2026-11-07T15:00:00.000Z" })));
  });

  test("hora que não faz sentido avisa e não chama a API; a gaveta continua aberta", async () => {
    // 23:00 de hoje (Brasília) está no futuro e "ontem 23:00" é antes do horário previsto: inválida.
    mockPick.h = 23; mockPick.m = 0;
    await renderApp(<ResolveButtons {...re} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await fireEvent.press(await screen.findByTestId("time-picker"));
    await fireEvent.press(screen.getByRole("button", { name: "Confirmar" }));
    expect(mockToast.error).toHaveBeenCalledWith("Hora da aplicação inválida. Confira o horário.");
    expect(mockRecord).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeOnTheScreen();
  });

  test("resposta invalid-time da API mantém a gaveta e avisa com erro", async () => {
    mockRecord.mockResolvedValue({ recorded: false, reason: "invalid-time" });
    await renderApp(<ResolveButtons {...re} />);
    await fireEvent.press(screen.getByRole("button", { name: "Feito" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(mockToast.error).toHaveBeenCalledWith("Hora da aplicação inválida. Confira o horário."));
    expect(screen.getByRole("button", { name: "Confirmar" })).toBeOnTheScreen();
  });
});

describe("DoseCard", () => {
  const card = { ...med, dose: "1 comprimido", reschedule: false, timeLabel: "08:00", relative: "há 4 h" };

  test("mostra paciente, item · dose, horário, relativo e selo", async () => {
    await renderApp(<DoseCard {...card} tone="overdue" />);
    expect(screen.getByText("Izzy")).toBeOnTheScreen();
    expect(screen.getByText("Dipirona · 1 comprimido")).toBeOnTheScreen();
    expect(screen.getByText("08:00")).toBeOnTheScreen();
    expect(screen.getByText("há 4 h")).toBeOnTheScreen();
    expect(screen.getByText("Atrasada")).toBeOnTheScreen();
    expect(screen.getByRole("button", { name: "Feito" })).toBeOnTheScreen();
  });

  test("sem dose mostra só o item", async () => {
    await renderApp(<DoseCard {...card} dose={null} tone="now" />);
    expect(screen.getByText("Dipirona")).toBeOnTheScreen();
    expect(screen.getByText("Agora")).toBeOnTheScreen();
  });

  test("próxima (upcoming) não tem botões", async () => {
    await renderApp(<DoseCard {...card} tone="upcoming" />);
    expect(screen.getByText("Próxima")).toBeOnTheScreen();
    expect(screen.queryByRole("button", { name: "Feito" })).toBeNull();
  });
});
