import { renderApp } from "./helpers";
import { COLORS } from "@/theme/colors";

const mockStack = jest.fn((_p: unknown) => null);
jest.mock("expo-router", () => ({ Stack: (p: unknown) => mockStack(p) }));

import PacientesLayout from "@/app/(app)/pacientes/_layout";

test("a pilha de pacientes tem fundo opaco do tema: ao trocar de tela, a anterior não aparece por baixo", async () => {
  await renderApp(<PacientesLayout />);
  const props = mockStack.mock.calls[0][0] as { screenOptions: { contentStyle: { backgroundColor: string } } };
  expect(props.screenOptions.contentStyle.backgroundColor).toBe(COLORS.light.background);
  expect(COLORS.light.background).toMatch(/^#[0-9a-f]{6}$/);
});
