import { fireEvent, screen } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockRouter = { replace: jest.fn() };
jest.mock("expo-router", () => ({ useRouter: () => mockRouter }));
jest.mock("react-native-safe-area-context", () => ({
  ...jest.requireActual("react-native-safe-area-context"),
  useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }),
}));

import NotFound from "@/app/+not-found";

test("rota inexistente: mensagem em português e um botão visível que volta ao início", async () => {
  await renderApp(<NotFound />);
  expect(screen.getByText("Página não encontrada")).toBeOnTheScreen();
  expect(screen.getByText("O endereço não existe ou o link é antigo.")).toBeOnTheScreen();
  // Botão de verdade (com fundo), não só texto claro solto sobre o fundo claro.
  await fireEvent.press(screen.getByRole("button", { name: "Ir para o início" }));
  expect(mockRouter.replace).toHaveBeenCalledWith("/");
});

test("respeita a área segura do topo (notch / Dynamic Island)", async () => {
  await renderApp(<NotFound />);
  const root = screen.getByTestId("not-found");
  const style = Array.isArray(root.props.style) ? Object.assign({}, ...root.props.style.flat(Infinity).filter(Boolean)) : root.props.style;
  expect(style.paddingTop).toBeGreaterThanOrEqual(59);
});
