import { AlertCircle, BellRing, CheckCircle2, Clock, SkipForward, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tone = "overdue" | "now" | "upcoming" | "done" | "skipped";

const TONES: Record<Tone, { label: string; icon: LucideIcon; className: string }> = {
  overdue: { label: "Atrasada", icon: AlertCircle, className: "bg-destructive-soft text-destructive-ink" },
  now: { label: "Agora", icon: BellRing, className: "bg-warning-soft text-warning-ink" },
  upcoming: { label: "Próxima", icon: Clock, className: "bg-info-soft text-info-ink" },
  done: { label: "Feito", icon: CheckCircle2, className: "bg-success-soft text-success-ink" },
  skipped: { label: "Pulado", icon: SkipForward, className: "bg-muted text-muted-foreground" },
};

/** Sempre ícone + texto: o status nunca depende só da cor. */
export function StatusBadge({ tone, className }: { tone: Tone; className?: string }) {
  const { label, icon: Icon, className: toneClass } = TONES[tone];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", toneClass, className)}>
      <Icon aria-hidden className="size-3.5" />
      {label}
    </span>
  );
}
