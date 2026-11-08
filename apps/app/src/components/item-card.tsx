import { Pill, Stethoscope } from "lucide-react-native";
import type { ItemDto } from "@medicron/shared";
import { ListRow } from "@/components/list-row";

export function ItemCard({ item, onPress }: { item: ItemDto; onPress: () => void }) {
  return (
    <ListRow
      icon={item.kind === "procedure" ? Stethoscope : Pill}
      title={item.name}
      subtitle={`${item.kind === "procedure" ? "Procedimento" : "Medicação"}${item.defaultDose ? ` · ${item.defaultDose}` : ""}`}
      onPress={onPress}
    />
  );
}
