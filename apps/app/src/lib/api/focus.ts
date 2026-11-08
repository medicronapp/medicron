import { AppState } from "react-native";
import { focusManager } from "@tanstack/react-query";

/**
 * No React Native não existe "foco da janela": liga o TanStack Query ao estado do app, para as telas
 * (a Hoje, principalmente) atualizarem sozinhas quando o app volta do segundo plano.
 */
export function bindFocusToAppState() {
  focusManager.setEventListener((handleFocus) => {
    const sub = AppState.addEventListener("change", (state) => handleFocus(state === "active"));
    return () => sub.remove();
  });
}
