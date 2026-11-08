import { View } from "react-native";
import { Slot } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppHeader } from "@/components/app-header";
import { SidebarNav } from "@/components/sidebar-nav";
import { TabBar } from "@/components/tab-bar";
import { useIsWide } from "@/lib/use-breakpoint";

/** Casca das telas logadas: barra lateral a partir de 768 px; abaixo disso, abas na base. */
export default function AppLayout() {
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 flex-row bg-background" style={{ paddingTop: insets.top }}>
      {wide ? <SidebarNav /> : null}
      <View className="flex-1">
        <AppHeader showBrand={!wide} />
        <View testID="content" className="flex-1">
          <Slot />
        </View>
        {wide ? null : <TabBar />}
      </View>
    </View>
  );
}
