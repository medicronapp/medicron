import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import type { ItemDto } from "@medicron/shared";
import { renderApp } from "./helpers";

import { ItemCard } from "@/components/item-card";
import { ItemForm } from "@/components/item-form";

const item = (o: Partial<ItemDto> = {}): ItemDto => ({ id: "i1", name: "Dipirona", kind: "medication", defaultDose: null, notes: null, createdAt: "2026-01-01T00:00:00.000Z", ...o });

describe("ItemCard", () => {
  test("medicação com dose padrão: 'Medicação · dose'; toque chama onPress", async () => {
    const onPress = jest.fn();
    await renderApp(<ItemCard item={item({ defaultDose: "1/2 comprimido" })} onPress={onPress} />);
    expect(screen.getByText("Dipirona")).toBeOnTheScreen();
    expect(screen.getByText("Medicação · 1/2 comprimido")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Dipirona" }));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
  test("procedimento sem dose: só 'Procedimento'", async () => {
    await renderApp(<ItemCard item={item({ name: "Temperatura", kind: "procedure" })} onPress={() => {}} />);
    expect(screen.getByText("Procedimento")).toBeOnTheScreen();
  });
});

describe("ItemForm", () => {
  const type = (label: string, text: string) => fireEvent.changeText(screen.getByLabelText(label), text);
  const submit = () => fireEvent.press(screen.getByRole("button", { name: "Salvar" }));

  test("corpo mínimo: nome e tipo (medicação por padrão)", async () => {
    const onSubmit = jest.fn(async (_b: unknown) => {});
    await renderApp(<ItemForm onSubmit={onSubmit} />);
    expect(screen.getByRole("tab", { name: "Medicação" })).toBeSelected();
    await type("Nome", "  Dipirona ");
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Dipirona", kind: "medication" }));
  });

  test("defaultKind define o tipo inicial; trocar o tipo muda o corpo", async () => {
    const onSubmit = jest.fn(async (_b: unknown) => {});
    await renderApp(<ItemForm defaultKind="procedure" onSubmit={onSubmit} />);
    expect(screen.getByRole("tab", { name: "Procedimento" })).toBeSelected();
    await fireEvent.press(screen.getByRole("tab", { name: "Medicação" }));
    await type("Nome", "Soro");
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Soro", kind: "medication" }));
  });

  test("dose e observações aparadas vão no corpo", async () => {
    const onSubmit = jest.fn(async (_b: unknown) => {});
    await renderApp(<ItemForm onSubmit={onSubmit} />);
    await type("Nome", "Dipirona");
    await type("Dose / instrução padrão", " 0,5 ml ");
    await type("Observações", " dar com comida ");
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Dipirona", kind: "medication", defaultDose: "0,5 ml", notes: "dar com comida" }));
  });

  test.each(["", "   "])("nome '%s' mostra 'Informe o nome' e não envia", async (n) => {
    const onSubmit = jest.fn();
    await renderApp(<ItemForm onSubmit={onSubmit} />);
    await type("Nome", n);
    await submit();
    expect(await screen.findByText("Informe o nome")).toBeOnTheScreen();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("seções, dicas e limites do site", async () => {
    await renderApp(<ItemForm onSubmit={async () => {}} />);
    expect(screen.getByText("O que é")).toBeOnTheScreen();
    expect(screen.getByText("Detalhes")).toBeOnTheScreen();
    expect(screen.getByText("Ex.: Amoxicilina, Medir temperatura, Limpar olho esquerdo")).toBeOnTheScreen();
    expect(screen.getByText("Opcional. Ex.: 1/2 comprimido, 0,5 ml")).toBeOnTheScreen();
    expect(screen.getByText("Opcional")).toBeOnTheScreen();
    expect(screen.getByLabelText("Nome").props.maxLength).toBe(80);
    expect(screen.getByLabelText("Dose / instrução padrão").props.maxLength).toBe(120);
    expect(screen.getByLabelText("Observações").props.maxLength).toBe(1000);
  });

  test("editar mostra os valores atuais; apagar a dose padrão manda o corpo sem 'defaultDose'", async () => {
    const onSubmit = jest.fn(async (_b: unknown) => {});
    await renderApp(<ItemForm item={item({ kind: "procedure", name: "Temperatura", defaultDose: "1x", notes: "n" })} onSubmit={onSubmit} />);
    expect(screen.getByRole("tab", { name: "Procedimento" })).toBeSelected();
    expect(screen.getByLabelText("Nome").props.value).toBe("Temperatura");
    expect(screen.getByLabelText("Dose / instrução padrão").props.value).toBe("1x");
    await type("Dose / instrução padrão", "");
    await submit();
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: "Temperatura", kind: "procedure", notes: "n" }));
  });

  test("botão desabilitado durante o envio", async () => {
    await renderApp(<ItemForm item={item()} onSubmit={async () => {}} submitting />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });
});
