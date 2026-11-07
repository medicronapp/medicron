import { Pressable, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "@/lib/nav-items";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Barra lateral (telas largas): marca e os 4 itens com 44 px de altura, como a do site. */
export function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <View testID="sidebar-nav" className="w-64 gap-6 border-r border-border bg-sidebar p-4">
      <Pressable accessibilityRole="link" accessibilityLabel="Medicron" onPress={() => router.push("/")} className="flex-row items-center gap-2.5 px-2 py-1">
        <BrandMark />
        <Text className="text-lg font-semibold tracking-tight">Medicron</Text>
      </Pressable>
      <View className="gap-1">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <Pressable
              key={href}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => router.push(href as never)}
              className={cn("h-11 flex-row items-center gap-3 rounded-xl px-3", active ? "bg-brand-soft" : "active:bg-muted")}
            >
              <Icon icon={icon} color={active ? "brandInk" : "muted"} size={20} />
              <Text className={cn("text-sm font-medium", active ? "text-brand-ink" : "text-muted-foreground")}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
