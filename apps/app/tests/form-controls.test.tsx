import { View } from "react-native";
import { screen, fireEvent } from "@testing-library/react-native";
import { renderApp } from "./helpers";

jest.mock("@/lib/clock", () => ({ now: () => new Date("2026-11-08T15:00:00.000Z") })); // 12:00 em Brasília

const mockPick = { y: 2026, mo: 11, d: 20, h: 7, mi: 45 };
jest.mock("@react-native-community/datetimepicker", () => {
  const { Pressable, Text } = require("react-native");
  return {
    __esModule: true,
    default: (p: { mode: string; onChange: (e: unknown, d: Date) => void; accessibilityLabel?: string }) => (
      <Pressable testID={`picker-${p.mode}`} accessibilityLabel={p.accessibilityLabel} onPress={() => p.onChange({ type: "set" }, new Date(mockPick.y, mockPick.mo - 1, mockPick.d, mockPick.h, mockPick.mi))}>
        <Text>seletor</Text>
      </Pressable>
    ),
    DateTimePickerAndroid: { open: jest.fn() },
  };
});

import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SelectField } from "@/components/ui/select-field";
import { DateField } from "@/components/ui/date-field";
import { DateTimeField } from "@/components/ui/datetime-field";
import { Segmented } from "@/components/ui/segmented";

beforeEach(() => { mockPick.y = 2026; mockPick.mo = 11; mockPick.d = 20; mockPick.h = 7; mockPick.mi = 45; });

describe("Switch", () => {
  test("alterna e expõe o estado", async () => {
    const onValueChange = jest.fn();
    await renderApp(<Switch value={false} onValueChange={onValueChange} accessibilityLabel="Reprogramar horários" />);
    const sw = screen.getByRole("switch", { name: "Reprogramar horários" });
    expect(sw).not.toBeChecked();
    await fireEvent(sw, "valueChange", true);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });
  test("ligado", async () => {
    await renderApp(<Switch value onValueChange={() => {}} accessibilityLabel="x" />);
    expect(screen.getByRole("switch", { name: "x" })).toBeChecked();
  });
});

describe("Textarea", () => {
  test("multilinha com limite e texto", async () => {
    const onChangeText = jest.fn();
    await renderApp(<Textarea accessibilityLabel="Observações" value="a" onChangeText={onChangeText} maxLength={1000} />);
    const t = screen.getByLabelText("Observações");
    expect(t.props.multiline).toBe(true);
    expect(t.props.maxLength).toBe(1000);
    await fireEvent.changeText(t, "b");
    expect(onChangeText).toHaveBeenCalledWith("b");
  });
});

describe("SelectField", () => {
  const options = [
    { value: "m1", label: "Dipirona", group: "Medicações" },
    { value: "m2", label: "Amoxicilina", group: "Medicações" },
    { value: "p1", label: "Temperatura", group: "Procedimentos" },
  ];
  test("mostra o placeholder, abre o sheet agrupado e escolher chama onChange e fecha", async () => {
    const onChange = jest.fn();
    await renderApp(<SelectField value="" onChange={onChange} options={options} placeholder="Selecione…" accessibilityLabel="Medicação ou procedimento" />);
    expect(screen.getByText("Selecione…")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Medicação ou procedimento" }));
    expect(await screen.findByText("Medicações")).toBeOnTheScreen();
    expect(screen.getByText("Procedimentos")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Temperatura" }));
    expect(onChange).toHaveBeenCalledWith("p1");
  });
  test("mostra o rótulo da opção selecionada e a marca no sheet", async () => {
    await renderApp(<SelectField value="m2" onChange={() => {}} options={options} accessibilityLabel="Item" />);
    expect(screen.getByText("Amoxicilina")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Item" }));
    expect(await screen.findByRole("button", { name: "Amoxicilina", selected: true })).toBeOnTheScreen();
  });
  test("sem grupos funciona igual", async () => {
    const onChange = jest.fn();
    await renderApp(<SelectField value="" onChange={onChange} options={[{ value: "cat", label: "Gato" }]} placeholder="Selecione…" accessibilityLabel="Tipo" />);
    await fireEvent.press(screen.getByRole("button", { name: "Tipo" }));
    await fireEvent.press(await screen.findByRole("button", { name: "Gato" }));
    expect(onChange).toHaveBeenCalledWith("cat");
  });
});

describe("DateField", () => {
  test("devolve YYYY-MM-DD dos campos locais do aparelho", async () => {
    const onChange = jest.fn();
    await renderApp(<DateField value="2026-01-10" onChange={onChange} accessibilityLabel="Nascimento" />);
    await fireEvent.press(screen.getByTestId("picker-date"));
    expect(onChange).toHaveBeenCalledWith("2026-11-20");
  });
  test("vazio mostra 'Selecionar', que começa em hoje (Brasília)", async () => {
    const onChange = jest.fn();
    await renderApp(<DateField value="" onChange={onChange} accessibilityLabel="Nascimento" />);
    await fireEvent.press(screen.getByRole("button", { name: "Selecionar" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-08");
  });
  test("'Limpar' devolve vazio quando clearable", async () => {
    const onChange = jest.fn();
    await renderApp(<DateField value="2026-01-10" onChange={onChange} clearable accessibilityLabel="Nascimento" />);
    await fireEvent.press(screen.getByRole("button", { name: "Limpar" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
  test("sem clearable não há 'Limpar'", async () => {
    await renderApp(<DateField value="2026-01-10" onChange={() => {}} accessibilityLabel="Nascimento" />);
    expect(screen.queryByRole("button", { name: "Limpar" })).toBeNull();
  });
});

describe("DateTimeField", () => {
  test("trocar a data mantém a hora; trocar a hora mantém a data", async () => {
    const onChange = jest.fn();
    await renderApp(<DateTimeField value="2026-11-08T09:30" onChange={onChange} accessibilityLabel="Horário da primeira dose" />);
    await fireEvent.press(screen.getByTestId("picker-date"));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-20T09:30");
    await fireEvent.press(screen.getByTestId("picker-time"));
    expect(onChange).toHaveBeenLastCalledWith("2026-11-08T07:45");
  });
  test("vazio mostra 'Selecionar', que começa agora (12:00 de Brasília)", async () => {
    const onChange = jest.fn();
    await renderApp(<DateTimeField value="" onChange={onChange} clearable accessibilityLabel="Data final" />);
    await fireEvent.press(screen.getByRole("button", { name: "Selecionar" }));
    expect(onChange).toHaveBeenCalledWith("2026-11-08T12:00");
  });
  test("'Limpar' devolve vazio", async () => {
    const onChange = jest.fn();
    await renderApp(<DateTimeField value="2026-11-08T09:30" onChange={onChange} clearable accessibilityLabel="Data final" />);
    await fireEvent.press(screen.getByRole("button", { name: "Limpar" }));
    expect(onChange).toHaveBeenCalledWith("");
  });
});

describe("Segmented", () => {
  test("marca o ativo e troca ao tocar", async () => {
    const onChange = jest.fn();
    await renderApp(<View><Segmented items={[{ key: "dados", label: "Dados" }, { key: "rotina", label: "Rotina" }]} value="rotina" onChange={onChange} accessibilityLabel="Seções do paciente" /></View>);
    expect(screen.getByRole("tab", { name: "Rotina" })).toBeSelected();
    expect(screen.getByRole("tab", { name: "Dados" })).not.toBeSelected();
    await fireEvent.press(screen.getByRole("tab", { name: "Dados" }));
    expect(onChange).toHaveBeenCalledWith("dados");
  });
});
