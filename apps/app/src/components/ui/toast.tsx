import { Toaster as SonnerToaster, toast } from "sonner-native";
import { useScheme } from "@/theme/use-scheme";

export { toast };

/** Avisos no topo, centralizados e coloridos por tipo (como `position="top-center" richColors` do site). */
/** O tema vem do app (escolha da pessoa ou sistema), não do `useColorScheme` do sonner, que na web ignora a escolha. */
export function Toaster() {
  const theme = useScheme();
  return <SonnerToaster theme={theme} position="top-center" richColors />;
}
