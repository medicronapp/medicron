import { Pressable, View } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "@/lib/nav-items";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Barra de abas inferior (celular): 4 itens, o ativo em `bg-brand-soft`, como o `BottomNav` do site. */
export function TabBar() {
  const pathname = usePathname();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return (
    <View
      testID="tab-bar"
      accessibilityRole="tablist"
      style={{ paddingBottom: insets.bottom }}
      className="absolute inset-x-0 bottom-0 border-t border-border bg-background"
    >
      <View className="mx-auto w-full max-w-md flex-row gap-1 px-2 py-1.5">
        {NAV_ITEMS.map(({ href, label, icon }) => {
          const active = isActive(pathname, href);
          return (
            <Pressable
              key={href}
              accessibilityRole="button"
              accessibilityLabel={label}
              accessibilityState={{ selected: active }}
              onPress={() => router.push(href as never)}
              className={cn("min-h-12 flex-1 items-center justify-center gap-0.5 rounded-xl", active ? "bg-brand-soft" : "active:bg-muted")}
            >
              <Icon icon={icon} color={active ? "brandInk" : "muted"} size={20} strokeWidth={active ? 2.4 : 2} />
              <Text className={cn("text-[11px] font-medium", active ? "text-brand-ink" : "text-muted-foreground")}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
