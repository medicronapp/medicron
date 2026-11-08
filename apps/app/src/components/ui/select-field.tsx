import { useState } from "react";
import { Pressable, View } from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Check, ChevronDown } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Text } from "./text";

export type SelectOption = { value: string; label: string; group?: string };
type Props = {
  value: string; onChange: (value: string) => void; options: SelectOption[]; placeholder?: string;
  accessibilityLabel?: string; invalid?: boolean;
};

/** Campo de escolha (`NativeSelect` do site): mostra a opção e abre um sheet com a lista (agrupada, se houver `group`). */
export function SelectField({ value, onChange, options, placeholder, accessibilityLabel, invalid }: Props) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
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
      <Drawer open={open} onOpenChange={setOpen} title={accessibilityLabel}>
        <BottomSheetScrollView style={{ maxHeight: 360 }}>
          <View className="gap-1">
            {groups.map((g, gi) => (
              <View key={`${g.name ?? ""}-${gi}`} className="gap-1">
                {g.name ? <Text className="px-2 pt-2 text-sm font-semibold text-muted-foreground">{g.name}</Text> : null}
                {g.items.map((o) => (
                  <Pressable
                    key={o.value} accessibilityRole="button" accessibilityLabel={o.label} accessibilityState={{ selected: o.value === value }}
                    onPress={() => { onChange(o.value); setOpen(false); }}
                    className="h-11 flex-row items-center gap-3 rounded-lg px-2 active:bg-muted"
                  >
                    <Text className="flex-1 text-base">{o.label}</Text>
                    {o.value === value ? <Icon icon={Check} color="primary" size={18} /> : null}
                  </Pressable>
                ))}
              </View>
            ))}
          </View>
        </BottomSheetScrollView>
      </Drawer>
    </>
  );
}
