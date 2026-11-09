import { renderApp } from "./helpers";
import { COLORS } from "@/theme/colors";

const mockStack = jest.fn((_p: unknown) => null);
jest.mock("expo-router", () => ({ Stack: (p: unknown) => mockStack(p) }));

import PacientesLayout from "@/app/(app)/pacientes/_layout";
import ItensLayout from "@/app/(app)/itens/_layout";

test.each([["pacientes", PacientesLayout], ["itens", ItensLayout]])("a pilha de %s tem fundo opaco do tema: ao trocar de tela, a anterior não aparece por baixo", async (_n, Layout) => {
  mockStack.mockClear();
  await renderApp(<Layout />);
  const props = mockStack.mock.calls[0][0] as { screenOptions: { contentStyle: { backgroundColor: string } } };
  expect(props.screenOptions.contentStyle.backgroundColor).toBe(COLORS.light.background);
  expect(COLORS.light.background).toMatch(/^#[0-9a-f]{6}$/);
});
