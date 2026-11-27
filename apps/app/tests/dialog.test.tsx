import { fireEvent, screen, within } from "@testing-library/react-native";
import { Pressable } from "react-native";
import { renderApp } from "./helpers";
import { Dialog } from "@/components/ui/dialog";
import { Text } from "@/components/ui/text";

describe("Dialog", () => {
  test("o fundo escurecido é irmão do cartão (o toque dentro do cartão nunca chega nele) e fecha ao tocar", async () => {
    const onOpenChange = jest.fn();
    const inner = jest.fn();
    await renderApp(
      <Dialog open onOpenChange={onOpenChange} title="Teste">
        <Pressable accessibilityRole="button" accessibilityLabel="Dentro" onPress={inner}><Text>dentro</Text></Pressable>
      </Dialog>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Dentro" }));
    expect(inner).toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    // O cartão não pode ser descendente do botão "Fechar": no navegador o clique subiria até ele.
    const backdrop = screen.getByLabelText("Fechar", { includeHiddenElements: true }) // oculto de propósito para leitores de tela: o cartão é o modal;
    expect(within(backdrop).queryByLabelText("Dentro")).toBeNull();
    await fireEvent.press(backdrop);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
