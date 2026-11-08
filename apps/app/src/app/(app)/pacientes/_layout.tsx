import { Stack } from "expo-router";

/** Pilha das telas de pacientes (lista → novo / detalhe → nova rotina), sem cabeçalho nativo: o cabeçalho é do app. */
export default function PacientesLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }} />;
}
