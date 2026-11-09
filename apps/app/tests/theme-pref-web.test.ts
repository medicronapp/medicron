// Simula o navegador: o ambiente do Jest é Node, sem document nem localStorage.
type Listener = () => void;
const g = globalThis as Record<string, unknown>;
let store: Record<string, string>;
let storageBroken: boolean;
let dataset: Record<string, string | undefined>;
let systemDark: boolean;

function install() {
  store = {};
  storageBroken = false;
  dataset = {};
  systemDark = false;
  g.localStorage = {
    getItem: (k: string) => { if (storageBroken) throw new Error("bloqueado"); return store[k] ?? null; },
    setItem: (k: string, v: string) => { if (storageBroken) throw new Error("bloqueado"); store[k] = v; },
  };
  g.document = { documentElement: { dataset }, querySelector: () => null };
  const listeners = new Set<Listener>();
  g.window = {
    matchMedia: () => ({
      get matches() { return systemDark; },
      addEventListener: (_: string, l: Listener) => listeners.add(l),
      removeEventListener: (_: string, l: Listener) => listeners.delete(l),
    }),
    __fireSystem: () => listeners.forEach((l) => l()),
  };
}

import { renderHook, act } from "@testing-library/react-native";
import { applyThemePref, loadThemePref, saveThemePref } from "@/lib/theme-pref.web";
import { useScheme } from "@/theme/use-scheme.web";

beforeEach(install);

describe("preferência de tema na web", () => {
  test("sem valor guardado ou inválido: system", async () => {
    expect(await loadThemePref()).toBe("system");
    store["medicron.theme"] = "roxo";
    expect(await loadThemePref()).toBe("system");
  });
  test("devolve o valor guardado quando é válido", async () => {
    for (const v of ["light", "dark", "system"] as const) {
      store["medicron.theme"] = v;
      expect(await loadThemePref()).toBe(v);
    }
  });
  test("localStorage bloqueado (modo privado): não quebra, cai em system e ignora o salvar", async () => {
    storageBroken = true;
    expect(await loadThemePref()).toBe("system");
    await expect(saveThemePref("dark")).resolves.toBeUndefined();
  });
  test("saveThemePref guarda na mesma chave do app nativo", async () => {
    await saveThemePref("dark");
    expect(store["medicron.theme"]).toBe("dark");
  });
  test("applyThemePref: claro e escuro fixam data-theme; system remove", () => {
    applyThemePref("dark");
    expect(dataset.theme).toBe("dark");
    applyThemePref("light");
    expect(dataset.theme).toBe("light");
    applyThemePref("system");
    expect(dataset.theme).toBeUndefined();
  });
});

describe("useScheme na web", () => {
  test("escolha fixa vence o aparelho; system segue o aparelho ao vivo", async () => {
    systemDark = true;
    const { result } = await renderHook(() => useScheme());
    expect(result.current).toBe("dark");
    await act(async () => applyThemePref("light"));
    expect(result.current).toBe("light");
    await act(async () => applyThemePref("system"));
    expect(result.current).toBe("dark");
    systemDark = false;
    await act(async () => (g.window as { __fireSystem: () => void }).__fireSystem());
    expect(result.current).toBe("light");
    await act(async () => applyThemePref("dark"));
    expect(result.current).toBe("dark");
  });
});
