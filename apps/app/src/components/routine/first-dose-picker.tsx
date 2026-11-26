import { useState } from "react";
import { View } from "react-native";
import { TIME_SHORTCUTS, addDays, dayKey, firstDoseAt } from "@medicron/shared";
import { useIsWide } from "@/lib/use-breakpoint";
import { initialCustom, resolveFirstDose, whenLabel, withTime, type FirstDose } from "@/lib/routine-form";
import { TimeWheel } from "@/components/routine/time-wheel";
import { Chip } from "@/components/ui/chip";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateField } from "@/components/ui/date-field";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/segmented";
import { Text } from "@/components/ui/text";

type Props = { value: FirstDose; onChange: (v: FirstDose) => void; now: Date };

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const DAYS = [{ key: "today", label: "Hoje" }, { key: "tomorrow", label: "Amanhã" }, { key: "other", label: "Outro dia…" }];

/** Quando é a primeira dose: agora, na próxima hora cheia ou num horário escolhido (rodas de hora e minuto no próprio cartão). */
type Custom = Extract<FirstDose, { kind: "custom" }>;

/** Rodas de hora e minuto com os atalhos de horário (iguais no painel da página e no diálogo). */
function TimeWheels({ custom, onChange, now }: { custom: Custom; onChange: (v: FirstDose) => void; now: Date }) {
  return (
    <>
      <View className="flex-row items-center justify-center gap-1">
        <TimeWheel values={HOURS} selected={custom.time.slice(0, 2)} label={(v) => `Hora ${v}`} onSelect={(h) => onChange(withTime(custom, `${h}:${custom.time.slice(3)}`, now))} />
        <Text className="text-2xl font-bold text-brand-ink">:</Text>
        <TimeWheel values={MINUTES} selected={custom.time.slice(3)} label={(v) => `Minuto ${v}`} onSelect={(m) => onChange(withTime(custom, `${custom.time.slice(0, 2)}:${m}`, now))} />
      </View>
      <View className="flex-row flex-wrap justify-center gap-2">
        {TIME_SHORTCUTS.map((s) => (
          <Chip key={s.time} label={s.label} selected={custom.time === s.time} onPress={() => onChange(withTime(custom, s.time, now))} />
        ))}
      </View>
    </>
  );
}

/** Quando é a primeira dose: agora, na próxima hora cheia ou num horário escolhido (painel na página; diálogo em tela larga). */
export function FirstDosePicker({ value, onChange, now }: Props) {
  const wide = useIsWide();
  const [dialog, setDialog] = useState(false);
  const custom = value.kind === "custom" ? value : null;
  const today = dayKey(now);
  const dateOf = (c: Custom) => (c.day === "today" ? today : c.day === "tomorrow" ? addDays(today, 1) : c.otherDate);
  const pickDate = (c: Custom, date: string) =>
    onChange(date === today ? { ...c, day: "today" } : date === addDays(today, 1) ? { ...c, day: "tomorrow" } : { ...c, day: "other", otherDate: date });
  return (
    <View className="gap-3">
      <ChoiceCard title="Agora" subtitle={whenLabel(firstDoseAt("now", now), now)} selected={value.kind === "now"} onPress={() => onChange({ kind: "now" })} />
      <ChoiceCard title="Na próxima hora cheia" subtitle={whenLabel(firstDoseAt("nextHour", now), now)} selected={value.kind === "nextHour"} onPress={() => onChange({ kind: "nextHour" })} />
      <ChoiceCard
        title="Escolher o horário" selected={!!custom}
        onPress={() => { if (!custom) onChange(initialCustom(now)); if (wide) setDialog(true); }}
        subtitle={custom ? whenLabel(resolveFirstDose(custom, now), now) : "Hora e dia, num seletor fácil"}
      />
      {custom && wide ? (
        <Dialog
          open={dialog} onOpenChange={setDialog} title="Horário da primeira dose"
          footer={<Button size="lg" onPress={() => setDialog(false)} accessibilityLabel="Concluir">Concluir</Button>}
        >
          <View className="flex-row gap-6">
            <View className="flex-1"><Calendar value={dateOf(custom)} min={today} onChange={(d) => pickDate(custom, d)} /></View>
            <View className="flex-1 justify-center gap-3"><TimeWheels custom={custom} onChange={onChange} now={now} /></View>
          </View>
        </Dialog>
      ) : null}
      {custom && !wide ? (
        <View className="gap-3 rounded-2xl border border-border bg-card p-3">
          <Segmented items={DAYS} value={custom.day} onChange={(day) => onChange({ ...custom, day: day as typeof custom.day })} accessibilityLabel="Dia" />
          {custom.day === "other" ? (
            <DateField value={custom.otherDate} onChange={(otherDate) => onChange({ ...custom, otherDate })} accessibilityLabel="Dia da primeira dose" />
          ) : null}
          <TimeWheels custom={custom} onChange={onChange} now={now} />
        </View>
      ) : null}
    </View>
  );
}
