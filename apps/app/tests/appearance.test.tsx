import { Appearance, Platform } from "react-native";
import { fireEvent, screen, waitFor } from "@testing-library/react-native";
import { renderApp } from "./helpers";

const mockStore: { value: string | null } = { value: null };
jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(async () => mockStore.value),
  setItemAsync: jest.fn(async (_k: string, v: string) => { mockStore.value = v; }),
}));

import * as SecureStore from "expo-secure-store";
import { applyThemePref, loadThemePref, saveThemePref } from "@/lib/theme-pref";
import { AppearanceCard } from "@/components/appearance-card";

beforeEach(() => {
  jest.clearAllMocks();
  mockStore.value = null;
});

describe("preferência de tema", () => {
  test("padrão 'system' sem valor guardado e com valor inválido", async () => {
    expect(await loadThemePref()).toBe("system");
    mockStore.value = "roxo";
    expect(await loadThemePref()).toBe("system");
  });
  test("devolve o valor guardado quando é válido", async () => {
    for (const v of ["light", "dark", "system"] as const) {
      mockStore.value = v;
      expect(await loadThemePref()).toBe(v);
    }
  });
  test("saveThemePref guarda", async () => {
    await saveThemePref("dark");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), "dark");
  });
  test("applyThemePref: claro e escuro fixam o tema; sistema volta a seguir o aparelho (unspecified)", () => {
    const spy = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
    applyThemePref("dark");
    expect(spy).toHaveBeenLastCalledWith("dark");
    applyThemePref("light");
    expect(spy).toHaveBeenLastCalledWith("light");
    applyThemePref("system");
    expect(spy).toHaveBeenLastCalledWith("unspecified");
    spy.mockRestore();
  });
});

describe("AppearanceCard", () => {
  test("três opções; marca a guardada; tocar aplica, guarda e passa a marcar", async () => {
    mockStore.value = "light";
    const spy = jest.spyOn(Appearance, "setColorScheme").mockImplementation(() => {});
    await renderApp(<AppearanceCard />);
    expect(screen.getByLabelText("Tema do aplicativo")).toBeOnTheScreen();
    await waitFor(() => expect(screen.getByRole("radio", { name: "Claro" })).toBeSelected());
    expect(screen.getByRole("radio", { name: "Escuro" })).not.toBeSelected();
    expect(screen.getByRole("radio", { name: "Sistema" })).not.toBeSelected();
    await fireEvent.press(screen.getByRole("radio", { name: "Escuro" }));
    expect(spy).toHaveBeenLastCalledWith("dark");
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(expect.any(String), "dark");
    expect(screen.getByRole("radio", { name: "Escuro" })).toBeSelected();
    spy.mockRestore();
  });

  test("sem preferência guardada, 'Sistema' vem marcado", async () => {
    await renderApp(<AppearanceCard />);
    await waitFor(() => expect(screen.getByRole("radio", { name: "Sistema" })).toBeSelected());
  });

  test("na web o cartão não aparece (o escuro da web é do navegador)", async () => {
    const original = Platform.OS;
    Platform.OS = "web";
    await renderApp(<AppearanceCard />);
    expect(screen.queryByLabelText("Tema do aplicativo")).toBeNull();
    Platform.OS = original;
  });
});
