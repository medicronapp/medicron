import { useState } from "react";
import { Pressable, View } from "react-native";
import { Check, ChevronDown, type LucideIcon } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Text } from "./text";

export type SelectOption = { value: string; label: string; group?: string; icon?: LucideIcon };
const COLUMNS = 3;
const chunk = <T,>(items: T[], size: number): T[][] => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

type Props = {
  value: string; onChange: (value: string) => void; options: SelectOption[]; placeholder?: string;
  accessibilityLabel?: string; invalid?: boolean;
  /** "list" (padrão): linhas com marca de seleção. "cards": cartões em 3 colunas, ícone em cima e nome embaixo. */
  layout?: "list" | "cards";
};

/** Campo de escolha (`NativeSelect` do site): mostra a opção e abre um sheet com as opções (lista rolável ou cartões). */
export function SelectField({ value, onChange, options, placeholder, accessibilityLabel, invalid, layout = "list" }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  const pick = (v: string) => { onChange(v); setOpen(false); };
  const groups = options.reduce<{ name?: string; items: SelectOption[] }[]>((acc, o) => {
    const last = acc.at(-1);
    if (last && last.name === o.group) last.items.push(o);
    else acc.push({ name: o.group, items: [o] });
    return acc;
  }, []);

  return (
    <>
      <Pressable
        accessibilityRole="button" accessibilityLabel={accessibilityLabel} accessibilityValue={{ text: current?.label ?? placeholder }}
        onPress={() => setOpen(true)}
        className={cn("h-11 flex-row items-center justify-between gap-2 rounded-lg border border-input px-3", invalid && "border-destructive")}
      >
        <Text numberOfLines={1} className={cn("flex-1 text-base", !current && "text-muted-foreground")}>{current?.label ?? placeholder ?? ""}</Text>
        <Icon icon={ChevronDown} color="muted" size={16} />
      </Pressable>
      <Drawer open={open} onOpenChange={setOpen} title={accessibilityLabel} scrollable={layout === "list"}>
        {layout === "cards" ? (
          <View testID="cards-grid" style={{ gap: 12 }}>
            {chunk(options, COLUMNS).map((row, ri) => (
              <View key={ri} testID="cards-row" style={{ flexDirection: "row", gap: 12 }}>
                {row.map((o) => {
                  const on = o.value === value;
                  return (
                    <Pressable
                      key={o.value} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: on }}
                      onPress={() => pick(o.value)} style={{ flex: 1 }}
                      className={cn("min-h-24 items-center justify-center gap-2 rounded-2xl border p-3", on ? "border-primary bg-brand-soft" : "border-border bg-card active:bg-muted")}
                    >
                      {o.icon ? <Icon icon={o.icon} color={on ? "brandInk" : "foreground"} size={28} /> : null}
                      <Text numberOfLines={1} className={cn("text-sm font-medium", on && "text-brand-ink")}>{o.label}</Text>
                    </Pressable>
                  );
                })}
                {/* Linha incompleta: espaços vazios mantêm cada cartão do mesmo tamanho dos de cima. */}
                {Array.from({ length: COLUMNS - row.length }, (_, k) => <View key={`f${k}`} testID="cards-filler" style={{ flex: 1 }} />)}
              </View>
            ))}
          </View>
        ) : (
          <View className="gap-1">
            {groups.map((g, gi) => (
              <View key={`${g.name ?? ""}-${gi}`} className="gap-1">
                {g.name ? <Text className="px-2 pt-2 text-sm font-semibold text-muted-foreground">{g.name}</Text> : null}
                {g.items.map((o) => (
                  <Pressable
                    key={o.value} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value }}
                    onPress={() => pick(o.value)} className="h-11 flex-row items-center gap-3 rounded-lg px-2 active:bg-muted"
                  >
                    <Text className="flex-1 text-base">{o.label}</Text>
                    {o.value === value ? <Icon icon={Check} color="primary" size={18} /> : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        )}
      </Drawer>
    </>
  );
}
