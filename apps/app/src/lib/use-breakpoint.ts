import { useWindowDimensions } from "react-native";

/** Mesmo ponto de corte `md` do site (768 px): daí em diante vale a barra lateral. */
export const useIsWide = () => useWindowDimensions().width >= 768;
