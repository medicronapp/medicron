import { screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";
import NotFound from "@/app/+not-found";

test("rota inexistente: mensagem em português e caminho de volta ao início", async () => {
  await renderApp(<NotFound />);
  expect(screen.getByText("Página não encontrada")).toBeOnTheScreen();
  expect(screen.getByText("O endereço não existe ou o item foi arquivado.")).toBeOnTheScreen();
  expect(screen.getByRole("link", { name: "Ir para o início" })).toBeOnTheScreen();
});
