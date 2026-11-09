import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { fetchMe } from "@/lib/api/me";
import { useAppSession } from "@/lib/session";

/** O usuário, a conta ativa e o papel (`/me`): uma consulta só para o cabeçalho, a Conta e a guarda de versão. */
export function useMe() {
  const { status } = useAppSession();
  return useQuery({ queryKey: ["me"], queryFn: () => fetchMe(apiClient), enabled: status === "signedIn" });
}
