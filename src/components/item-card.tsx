import Link from "next/link";
import { ChevronRight, Pill, Stethoscope } from "lucide-react";
import type { Item } from "@/lib/db/schema";

export function ItemCard({ item }: { item: Item }) {
  const Icon = item.kind === "procedure" ? Stethoscope : Pill;
  return (
    <Link
      href={`/itens/${item.id}`}
      className="flex items-center gap-3 rounded-2xl border bg-card p-3.5 shadow-xs transition-colors hover:bg-muted/50"
    >
      <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        <Icon aria-hidden className="size-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-base font-semibold">{item.name}</p>
        <p className="truncate text-sm text-muted-foreground">
          {item.kind === "procedure" ? "Procedimento" : "Medicação"}
          {item.defaultDose ? ` · ${item.defaultDose}` : ""}
        </p>
      </div>
      <ChevronRight aria-hidden className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
