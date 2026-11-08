import { createContext } from "react";

/** Verdadeiro dentro de um Drawer: os campos de texto precisam do input do bottom-sheet para o teclado empurrar o sheet. */
export const InSheetContext = createContext(false);
