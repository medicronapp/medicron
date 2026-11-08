import { Stack } from "expo-router";
import { useColors } from "@/theme/colors";

/** Pilha das telas de itens (lista → novo / detalhe), sem cabeçalho nativo: o cabeçalho é do app. */
export default function ItensLayout() {
  const colors = useColors();
  // Fundo opaco: com cena transparente, a tela que sai aparece por baixo da que entra até sumir de uma vez.
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
