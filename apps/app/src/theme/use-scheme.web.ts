import { useSyncExternalStore } from "react";
import { getThemePref, subscribeThemePref } from "@/lib/theme-store.web";

const query = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null);

function snapshot(): "light" | "dark" {
  const pref = getThemePref();
  if (pref !== "system") return pref;
  return query()?.matches ? "dark" : "light";
}

function subscribe(listener: () => void) {
  const mq = query();
  const off = subscribeThemePref(listener);
  mq?.addEventListener("change", listener);
  return () => { off(); mq?.removeEventListener("change", listener); };
}

/** Na web: a escolha fixa da pessoa (Claro/Escuro) ou, em "Padrão", o esquema do navegador ao vivo. */
export function useScheme(): "light" | "dark" {
  return useSyncExternalStore(subscribe, snapshot, () => "light");
}
