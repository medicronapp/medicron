import { Stack } from "expo-router";
import { useColors } from "@/theme/colors";

/** Pilha das telas de pacientes (lista → novo / detalhe → nova rotina), sem cabeçalho nativo: o cabeçalho é do app. */
export default function PacientesLayout() {
  const colors = useColors();
  // Fundo opaco: com cena transparente, a tela que sai aparece por baixo da que entra até sumir de uma vez.
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
