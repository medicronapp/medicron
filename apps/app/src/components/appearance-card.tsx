import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Monitor, Moon, Sun } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { applyThemePref, loadThemePref, saveThemePref, type ThemePref } from "@/lib/theme-pref";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const OPTIONS = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Padrão", icon: Monitor },
] as const;

/** Escolha do tema: Claro e Escuro fixos, ou Sistema (segue o aparelho/navegador). */
export function AppearanceCard() {
  const [pref, setPref] = useState<ThemePref | null>(null);

  useEffect(() => {
    let alive = true;
    void loadThemePref().then((p) => { if (alive) setPref(p); });
    return () => { alive = false; };
  }, []);

  function choose(next: ThemePref) {
    setPref(next);
    applyThemePref(next);
    void saveThemePref(next);
  }

  return (
    <View accessibilityLabel="Tema do aplicativo" accessibilityRole="radiogroup" className="flex-row gap-2">
      {OPTIONS.map(({ value, label, icon }) => {
        const on = pref === value;
        return (
          <Pressable
            key={value} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ selected: on }}
            onPress={() => choose(value)}
            className={cn("h-16 flex-1 items-center justify-center gap-1 rounded-xl border", on ? "border-primary bg-brand-soft" : "border-border active:bg-muted")}
          >
            <Icon icon={icon} color={on ? "brandInk" : "muted"} size={20} />
            <Text className={cn("text-sm font-medium", on ? "text-brand-ink" : "text-muted-foreground")}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
