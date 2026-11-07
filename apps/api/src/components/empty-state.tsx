import type { LucideIcon } from "lucide-react";

type Props = { icon: LucideIcon; title: string; description?: string; action?: React.ReactNode };

export function EmptyState({ icon: Icon, title, description, action }: Props) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed bg-card/50 px-6 py-10 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
        <Icon aria-hidden className="size-7" />
      </div>
      <div className="grid gap-1">
        <p className="text-base font-semibold">{title}</p>
        {description && <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
