// Simula o navegador: o ambiente do Jest é Node, sem document nem localStorage.
type Listener = () => void;
const g = globalThis as Record<string, unknown>;
let store: Record<string, string>;
let storageBroken: boolean;
let dataset: Record<string, string | undefined>;
let systemDark: boolean;
let metas: Record<"status" | "light" | "dark", { content: string; setAttribute: (n: string, v: string) => void }>;

function install() {
  store = {};
  storageBroken = false;
  dataset = {};
  systemDark = false;
  g.localStorage = {
    getItem: (k: string) => { if (storageBroken) throw new Error("bloqueado"); return store[k] ?? null; },
    setItem: (k: string, v: string) => { if (storageBroken) throw new Error("bloqueado"); store[k] = v; },
  };
  metas = {
    status: { content: "default", setAttribute(_: string, v: string) { this.content = v; } },
    light: { content: "#fbfaf7", setAttribute(_: string, v: string) { this.content = v; } },
    dark: { content: "#0b1314", setAttribute(_: string, v: string) { this.content = v; } },
  };
  g.document = {
    documentElement: { dataset },
    querySelector: (sel: string) =>
      sel.includes("status-bar-style") ? metas.status
      : sel.includes("theme-color") && sel.includes("light") ? metas.light
      : sel.includes("theme-color") && sel.includes("dark") ? metas.dark : null,
  };
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

describe("barra de status e cor do tema (iOS/Safari)", () => {
  test("escuro fixo: barra translúcida e theme-color escuro nos dois esquemas", () => {
    applyThemePref("dark");
    expect(metas.status.content).toBe("black-translucent");
    expect(metas.light.content).toBe("#0b1314");
    expect(metas.dark.content).toBe("#0b1314");
  });
  test("claro fixo, mesmo com o aparelho escuro: barra padrão e theme-color claro", () => {
    systemDark = true;
    applyThemePref("light");
    expect(metas.status.content).toBe("default");
    expect(metas.light.content).toBe("#fbfaf7");
    expect(metas.dark.content).toBe("#fbfaf7");
  });
  test("Padrão decide pelo aparelho e restaura as cores por esquema", () => {
    applyThemePref("dark");
    systemDark = true;
    applyThemePref("system");
    expect(metas.status.content).toBe("black-translucent");
    expect(metas.light.content).toBe("#fbfaf7");
    expect(metas.dark.content).toBe("#0b1314");
    systemDark = false;
    applyThemePref("system");
    expect(metas.status.content).toBe("default");
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
