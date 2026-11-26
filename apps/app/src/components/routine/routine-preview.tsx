import { View } from "react-native";
import { dayLabel, dosesPerDayLabel, formatTime, routineSummary, upcomingDoses } from "@medicron/shared";
import { Text } from "@/components/ui/text";

type Props = {
  name: string; intervalMinutes: number; anchor: Date; from: Date; endAt: Date | null; now: Date;
  duration: { days: number } | { until: string } | null;
  /** Linha logo abaixo da frase (ex.: "Começa hoje às 12:07 · termina em 14/11"). */
  detail?: string;
};

const SHOWN = 5;

/** Prévia viva: a rotina numa frase e os próximos horários, para a pessoa ver o resultado antes de salvar. */
export function RoutinePreview({ name, intervalMinutes, anchor, from, endAt, now, duration, detail }: Props) {
  const doses = upcomingDoses({ anchor, intervalMinutes, endAt, from, limit: SHOWN });
  const perDay = dosesPerDayLabel(intervalMinutes);
  return (
    <View className="gap-2 rounded-2xl border border-border bg-card p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-xs font-semibold text-muted-foreground">Resumo</Text>
        {perDay ? <View className="rounded-full bg-brand-soft px-2.5 py-0.5"><Text className="text-xs font-bold text-brand-ink">{perDay}</Text></View> : null}
      </View>
      <Text className="text-lg font-bold leading-6">{routineSummary({ name, intervalMinutes, duration })}</Text>
      {detail ? <Text className="text-sm text-muted-foreground">{detail}</Text> : null}
      <View className="my-1 h-px bg-border" />
      <Text className="text-xs font-semibold text-muted-foreground">Próximas doses</Text>
      {doses.length === 0 ? (
        <Text className="text-sm text-muted-foreground">Nenhuma dose nesse período.</Text>
      ) : (
        <View accessibilityLabel="Próximas doses" className="flex-row justify-between pt-1">
          {doses.map((d, i) => (
            <View key={d.getTime()} className="items-center gap-1">
              <View className={i === 0 ? "size-2.5 rounded-full bg-primary" : "size-2.5 rounded-full border-2 border-primary bg-card"} />
              <Text className="text-sm font-semibold">{formatTime(d)}</Text>
              <Text className="text-xs text-muted-foreground">{dayLabel(d, now)}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
