import "../global.css";
import { useEffect } from "react";
import { Slot } from "expo-router";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { GEIST_FONTS } from "@/theme/fonts";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts(GEIST_FONTS);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync();
  }, [loaded, error]);

  // A tela de abertura segue visível até a Geist carregar (ou falhar: aí cai na fonte do sistema).
  if (!loaded && !error) return null;
  return <Slot />;
}
