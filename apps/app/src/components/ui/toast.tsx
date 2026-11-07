import { Toaster as SonnerToaster, toast } from "sonner-native";

export { toast };

/** Avisos no topo, centralizados e coloridos por tipo (como `position="top-center" richColors` do site). */
export const Toaster = () => <SonnerToaster position="top-center" richColors />;
