import { View } from "react-native";
import { DURATION_DAYS } from "@medicron/shared";
import type { Duration } from "@/lib/routine-form";
import { Chip } from "@/components/ui/chip";
import { DateField } from "@/components/ui/date-field";

type Props = { value: Duration; onChange: (v: Duration) => void; defaultUntil: string; error?: string };

/** Por quanto tempo: contínuo, alguns dias de atalho ou até uma data (vale até o fim desse dia). */
export function DurationPicker({ value, onChange, defaultUntil }: Props) {
  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        <Chip label="Contínuo" selected={value.kind === "none"} onPress={() => onChange({ kind: "none" })} />
        {DURATION_DAYS.map((n) => (
          <Chip key={n} label={`${n} dias`} selected={value.kind === "days" && value.days === n} onPress={() => onChange({ kind: "days", days: n })} />
        ))}
        <Chip label="Até uma data…" selected={value.kind === "until"} onPress={() => { if (value.kind !== "until") onChange({ kind: "until", date: defaultUntil }); }} />
      </View>
      {value.kind === "until" ? <DateField value={value.date} onChange={(date) => onChange({ kind: "until", date })} accessibilityLabel="Data final" /> : null}
    </View>
  );
}
