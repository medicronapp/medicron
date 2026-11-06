"use client";
import { Pill, Stethoscope } from "lucide-react";
import { ResolveButtons } from "@/components/home/resolve-buttons";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";

export type DoseCardProps = {
  planId: string; scheduledFor: string; patientName: string; itemName: string; dose: string | null;
  kind: "medication" | "procedure"; reschedule: boolean; timeLabel: string; relative: string; tone: "overdue" | "now" | "upcoming";
};

const STRIPE: Record<DoseCardProps["tone"], string> = {
  overdue: "before:bg-destructive",
  now: "before:bg-warning",
  upcoming: "before:bg-info",
};

export function DoseCard(p: DoseCardProps) {
  const Icon = p.kind === "procedure" ? Stethoscope : Pill;
  return (
    <article
      className={cn(
        "relative grid gap-3 overflow-hidden rounded-2xl border bg-card p-4 pl-5 shadow-xs",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5",
        STRIPE[p.tone],
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{p.patientName}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {p.itemName}{p.dose ? ` · ${p.dose}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg leading-none font-semibold tabular-nums">{p.timeLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{p.relative}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge tone={p.tone} />
      </div>
      {p.tone !== "upcoming" && (
        <ResolveButtons planId={p.planId} scheduledFor={p.scheduledFor} kind={p.kind} reschedule={p.reschedule} itemName={p.itemName} patientName={p.patientName} />
      )}
    </article>
  );
}
