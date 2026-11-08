import { useState } from "react";
import { View } from "react-native";
import type { EntryDto } from "@medicron/shared";
import { dayKey, formatDateTime, formatTime, relativeLabel } from "@medicron/shared";
import { DoseCard } from "@/components/dose-card";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const LIMIT = 5;

/** Cuidados sem registro (hoje e ontem) e os que estão na hora. Mostra os 5 mais antigos. */
export function AttentionList({ entries, now }: { entries: EntryDto[]; now: string }) {
  const [all, setAll] = useState(false);
  if (entries.length === 0) return null;
  const nowDate = new Date(now);
  const shown = all ? entries : entries.slice(0, LIMIT);
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-lg font-semibold">Precisa de atenção · {entries.length}</Text>
      {shown.map((e) => {
        const at = new Date(e.scheduledFor);
        return (
          <DoseCard
            key={`${e.planId}-${e.scheduledFor}`}
            planId={e.planId} scheduledFor={e.scheduledFor} patientName={e.patientName} itemName={e.itemName}
            dose={e.dose} kind={e.kind} reschedule={e.reschedule} tone={e.state === "now" ? "now" : "overdue"}
            timeLabel={dayKey(at) === dayKey(nowDate) ? formatTime(at) : formatDateTime(at)}
            relative={relativeLabel(at, nowDate)}
          />
        );
      })}
      {!all && entries.length > LIMIT ? (
        <Button variant="outline" onPress={() => setAll(true)}>{`Ver todas (${entries.length})`}</Button>
      ) : null}
    </View>
  );
}
