import type { ThemePref } from "@/lib/theme-pref.web";

type Listener = () => void;
const listeners = new Set<Listener>();

const fromDocument = (): ThemePref => {
  const t = typeof document !== "undefined" ? document.documentElement?.dataset?.theme : undefined;
  return t === "light" || t === "dark" ? t : "system";
};

// Começa pelo que o script do <head> já aplicou (sem piscar o tema errado nos ícones).
let current: ThemePref = fromDocument();

export const getThemePref = (): ThemePref => current;
export const subscribeThemePref = (l: Listener) => { listeners.add(l); return () => { listeners.delete(l); }; };
export function setThemePref(pref: ThemePref): void {
  current = pref;
  listeners.forEach((l) => l());
}
