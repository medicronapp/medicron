import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = { label: string; items: { href: string; label: string; active: boolean }[] };

export function SegmentedLinks({ label, items }: Props) {
  return (
    <nav aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-muted p-1">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          aria-current={i.active ? "page" : undefined}
          className={cn(
            "flex h-10 items-center justify-center rounded-lg text-sm font-medium transition-colors",
            i.active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  );
}
