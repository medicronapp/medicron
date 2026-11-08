import { focusManager } from "@tanstack/react-query";

const mockListeners: ((s: string) => void)[] = [];
jest.mock("react-native", () => ({
  AppState: { addEventListener: (_t: string, fn: (s: string) => void) => { mockListeners.push(fn); return { remove: jest.fn() }; } },
}));

import { bindFocusToAppState } from "@/lib/api/focus";

test("voltar do segundo plano (AppState 'active') marca o app como em foco e dispara a atualização das consultas", () => {
  bindFocusToAppState();
  const change = mockListeners.at(-1)!;
  change("background");
  expect(focusManager.isFocused()).toBe(false);
  change("active");
  expect(focusManager.isFocused()).toBe(true);
});
