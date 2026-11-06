import { Pill, Stethoscope } from "lucide-react";
import type { Item } from "@/lib/db/schema";
import { ListRow } from "@/components/list-row";

export function ItemCard({ item }: { item: Item }) {
  return (
    <ListRow
      href={`/itens/${item.id}`}
      icon={item.kind === "procedure" ? Stethoscope : Pill}
      title={item.name}
      subtitle={`${item.kind === "procedure" ? "Procedimento" : "Medicação"}${item.defaultDose ? ` · ${item.defaultDose}` : ""}`}
    />
  );
}
