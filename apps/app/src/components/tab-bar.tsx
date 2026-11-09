import { useEffect, useState } from "react";
import { AccessibilityInfo, Platform, Pressable, View } from "react-native";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { usePathname, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { cn } from "@/lib/cn";
import { NAV_ITEMS, isActive } from "@/lib/nav-items";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Liquid Glass só no iOS 26+ (build com o SDK novo) e sem "Reduzir transparência"; nos demais casos, a barra de sempre. */
function useLiquidGlass(): boolean {
  const [reduceTransparency, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    if (Platform.OS !== "ios") return;
    let alive = true;
    AccessibilityInfo.isReduceTransparencyEnabled()
      .then((v) => { if (alive) setReduce(v); })
      .catch(() => { if (alive) setReduce(false); });
    const sub = AccessibilityInfo.addEventListener("reduceTransparencyChanged", setReduce);
    return () => { alive = false; sub.remove(); };
  }, []);
  return Platform.OS === "ios" && reduceTransparency === false && isLiquidGlassAvailable();
}

function Items({ glass }: { glass: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <>
      {NAV_ITEMS.map(({ href, label, icon }) => {
        const active = isActive(pathname, href);
        return (
          <Pressable
            key={href}
            accessibilityRole="button"
            accessibilityLabel={label}
            accessibilityState={{ selected: active }}
            onPress={() => router.navigate(href as never)}
            className={cn(
              "min-h-12 flex-1 items-center justify-center gap-0.5 rounded-xl",
              glass && "rounded-full",
              active ? (glass ? "bg-brand-20" : "bg-brand-soft") : !glass && "active:bg-muted",
            )}
          >
            <Icon icon={icon} color={active ? "brandInk" : "muted"} size={20} strokeWidth={active ? 2.4 : 2} />
            <Text className={cn("text-[11px] font-medium", active ? "text-brand-ink" : "text-muted-foreground")}>{label}</Text>
          </Pressable>
        );
      })}
    </>
  );
}

/**
 * Barra de abas inferior (celular): 4 itens, o ativo em destaque. No iOS 26 com Liquid Glass vira um painel de vidro
 * flutuante, afastado das bordas; no resto (iOS antigo, Android, web) é a barra de sempre, como o `BottomNav` do site.
 */
export function TabBar() {
  const glass = useLiquidGlass();
  const insets = useSafeAreaInsets();

  if (glass) {
    return (
      <View
        testID="tab-bar"
        accessibilityRole="tablist"
        pointerEvents="box-none"
        style={{ paddingBottom: Math.max(insets.bottom, 12) }}
        className="absolute inset-x-0 bottom-0 items-center px-4"
      >
        <GlassView
          isInteractive
          glassEffectStyle="regular"
          style={{ width: "100%", maxWidth: 420, borderRadius: 32, padding: 6, flexDirection: "row", gap: 4 }}
        >
          <Items glass />
        </GlassView>
      </View>
    );
  }

  return (
    <View
      testID="tab-bar"
      accessibilityRole="tablist"
      style={{ paddingBottom: insets.bottom }}
      className="absolute inset-x-0 bottom-0 border-t border-border bg-background"
    >
      <View className="mx-auto w-full max-w-md flex-row gap-1 px-2 py-1.5">
        <Items glass={false} />
      </View>
    </View>
  );
}
