import { Pressable, View } from "react-native";
import { Check, type LucideIcon } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { Drawer } from "./drawer";
import { Icon } from "./icon";
import { Text } from "./text";

export type MenuItem = {
  key: string;
  label: string;
  icon?: LucideIcon;
  destructive?: boolean;
  selected?: boolean;
  onPress: () => void;
};

type Props = { open: boolean; onOpenChange: (open: boolean) => void; title?: string; items: MenuItem[] };

/** Lista de ações em sheet: o equivalente nativo do DropdownMenu do site (linhas de 44 px). */
export function MenuSheet({ open, onOpenChange, title, items }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={title}>
      <View className="gap-1">
        {items.map((item) => (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            accessibilityState={{ selected: !!item.selected }}
            onPress={() => {
              item.onPress();
              onOpenChange(false);
            }}
            className="h-11 flex-row items-center gap-3 rounded-lg px-2 active:bg-muted"
          >
            {item.icon ? <Icon icon={item.icon} color={item.destructive ? "destructive" : "foreground"} size={20} /> : null}
            <Text className={cn("flex-1 text-base", item.destructive && "text-destructive")}>{item.label}</Text>
            {item.selected ? <Icon icon={Check} color="primary" size={18} /> : null}
          </Pressable>
        ))}
      </View>
    </Drawer>
  );
}
