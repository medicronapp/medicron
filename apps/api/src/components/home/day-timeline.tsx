"use client";
import { useState } from "react";
import Link from "next/link";
import { BellRing, CalendarCheck, CheckCircle2, CircleAlert, Clock, SkipForward, type LucideIcon } from "lucide-react";
import type { DayStatus } from "@/lib/completeness";
import { EmptyState } from "@/components/empty-state";
import { formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ResolveButtons } from "./resolve-buttons";
import type { SPatientDay, SEntry } from "./serialize";

const STATE: Record<SEntry["state"], { label: string; icon: LucideIcon; dot: string }> = {
  done: { label: "Feito", icon: CheckCircle2, dot: "bg-success-soft text-success-ink" },
  skipped: { label: "Pulado", icon: SkipForward, dot: "bg-muted text-muted-foreground" },
  missed: { label: "Sem registro", icon: CircleAlert, dot: "bg-destructive-soft text-destructive-ink" },
  now: { label: "Agora", icon: BellRing, dot: "bg-warning-soft text-warning-ink" },
  later: { label: "Mais tarde", icon: Clock, dot: "bg-muted text-muted-foreground" },
};

type Props = { patients: SPatientDay[]; selectedKey: string; todayKey: string; selectedStatus: DayStatus; now: string };

export function DayTimeline({ patients, selectedKey, todayKey, selectedStatus }: Props) {
  const [selectedPatient, setSelectedPatient] = useState<string | null>(null);
  const active = patients.find((c) => c.patientId === selectedPatient) ?? patients[0];
  const past = selectedKey !== todayKey;

  return (
    <section className="grid gap-3" aria-labelledby="linha-do-dia">
      <div className="flex items-center justify-between gap-2">
        <h2 id="linha-do-dia">Linha do dia</h2>
        {past && (
          <Link href="/" className="text-sm font-medium text-link underline-offset-4 hover:underline">Voltar para hoje</Link>
        )}
      </div>
      {past && (
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Dia {selectedKey.slice(8)}/{selectedKey.slice(5, 7)}</span>
          {selectedStatus === "lost" && <> · <span className="font-medium text-warning-ink">Dose sem solução</span></>}
          {selectedStatus === "ok" && " · Em dia"}
        </p>
      )}
      {!active ? (
        <EmptyState icon={CalendarCheck} title="Nenhum cuidado neste dia" description="Quando houver cuidados esperados, eles aparecem aqui." />
      ) : (
        <>
          <div role="tablist" aria-label="Pacientes" className="flex gap-2 overflow-x-auto pb-1">
            {patients.map((c) => (
              <button
                key={c.patientId} role="tab" type="button" id={`tab-${c.patientId}`} aria-controls={`panel-${c.patientId}`}
                aria-selected={c.patientId === active.patientId}
                onClick={() => setSelectedPatient(c.patientId)}
                className={cn(
                  "flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  c.patientId === active.patientId ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
                )}
              >
                <span className="max-w-32 truncate">{c.patientName}</span>
                {c.missed > 0 ? (
                  <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-bold text-white">{c.missed}</span>
                ) : (
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", c.patientId === active.patientId ? "bg-primary-foreground text-primary" : "bg-brand-soft text-brand-ink")}>
                    {c.resolved}/{c.total}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${active.patientId}`} aria-labelledby={`tab-${active.patientId}`} className="rounded-2xl border bg-card p-3">
            <ul className="divide-y">
              {active.entries.map((e) => {
                const s = STATE[e.state];
                const Icon = s.icon;
                return (
                  <li key={`${e.planId}-${e.scheduledFor}`} className="grid gap-2 py-3">
                    <div className="flex items-start gap-3">
                      <span className="w-12 shrink-0 pt-0.5 text-sm font-semibold tabular-nums">{formatTime(new Date(e.scheduledFor))}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{e.itemName}</p>
                        {(e.dose || e.value) && (
                          <p className="truncate text-sm text-muted-foreground">{[e.dose, e.value].filter(Boolean).join(" · ")}</p>
                        )}
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                          <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium", s.dot)}>
                            <Icon aria-hidden className="size-3.5" />
                            {s.label}
                          </span>
                          {e.resolvedBy && e.resolvedAt && (
                            <span className="text-muted-foreground">{e.resolvedBy} · {formatTime(new Date(e.resolvedAt))}</span>
                          )}
                          {e.late && <span className="rounded-full bg-warning-soft px-2 py-0.5 font-medium text-warning-ink">registrada depois</span>}
                        </p>
                        {e.note && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">“{e.note}”</p>}
                      </div>
                    </div>
                    {(e.state === "missed" || e.state === "now") && (
                      <ResolveButtons planId={e.planId} scheduledFor={e.scheduledFor} kind={e.kind} reschedule={e.reschedule} itemName={e.itemName} patientName={e.patientName} size="default" />
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
