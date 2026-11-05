"use client";
import { useState } from "react";
import { DoseCard } from "@/components/dose-card";
import { Button } from "@/components/ui/button";
import { dayKey, formatDateTime, formatTime, relativeLabel } from "@/lib/time";
import type { SEntry } from "./serialize";

const LIMIT = 5;

/** Cuidados sem registro (hoje e ontem) e os que estão na hora. Mostra os 5 mais antigos. */
export function AttentionList({ entries, now }: { entries: SEntry[]; now: string }) {
  const [all, setAll] = useState(false);
  if (entries.length === 0) return null;
  const nowDate = new Date(now);
  const shown = all ? entries : entries.slice(0, LIMIT);
  return (
    <section className="grid gap-3" aria-labelledby="atencao">
      <h2 id="atencao" className="flex items-center gap-2">
        Precisa de atenção · {entries.length}
      </h2>
      {shown.map((e) => {
        const at = new Date(e.scheduledFor);
        return (
          <DoseCard
            key={`${e.planId}-${e.scheduledFor}`}
            planId={e.planId} scheduledFor={e.scheduledFor} catName={e.catName} itemName={e.itemName}
            dose={e.dose} kind={e.kind} reschedule={e.reschedule} tone={e.state === "now" ? "now" : "overdue"}
            timeLabel={dayKey(at) === dayKey(nowDate) ? formatTime(at) : formatDateTime(at)}
            relative={relativeLabel(at, nowDate)}
          />
        );
      })}
      {!all && entries.length > LIMIT && (
        <Button variant="outline" onClick={() => setAll(true)}>Ver todas ({entries.length})</Button>
      )}
    </section>
  );
}
