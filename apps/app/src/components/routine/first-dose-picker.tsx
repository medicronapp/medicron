import { useState } from "react";
import { View } from "react-native";
import { TIME_SHORTCUTS, addDays, dayKey, firstDoseAt } from "@medicron/shared";
import { useIsWide } from "@/lib/use-breakpoint";
import { initialCustom, resolveFirstDose, shortDate, whenLabel, withTime, type FirstDose } from "@/lib/routine-form";
import { TimeWheel } from "@/components/routine/time-wheel";
import { Chip } from "@/components/ui/chip";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { DateField } from "@/components/ui/date-field";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { Segmented } from "@/components/ui/segmented";
import { Text } from "@/components/ui/text";

type Props = { value: FirstDose; onChange: (v: FirstDose) => void; now: Date };

const pad = (n: number) => String(n).padStart(2, "0");
const HOURS = Array.from({ length: 24 }, (_, i) => pad(i));
const MINUTES = Array.from({ length: 60 }, (_, i) => pad(i));
const DAYS = [{ key: "today", label: "Hoje" }, { key: "tomorrow", label: "Amanhã" }, { key: "other", label: "Outro dia…" }];

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

/** Diálogo de 2 passos (tela larga): 1) em que dia, só o calendário; 2) a que horas, só a roleta de hora e minuto. */
function DoseDialog({ open, onOpenChange, custom, onChange, now }: { open: boolean; onOpenChange: (o: boolean) => void; custom: Custom; onChange: (v: FirstDose) => void; now: Date }) {
  const [step, setStep] = useState<1 | 2>(1);
  const today = dayKey(now);
  const date = custom.day === "today" ? today : custom.day === "tomorrow" ? addDays(today, 1) : custom.otherDate;
  const pickDate = (d: string) =>
    onChange(d === today ? { ...custom, day: "today" } : d === addDays(today, 1) ? { ...custom, day: "tomorrow" } : { ...custom, day: "other", otherDate: d });
  const when = whenLabel(resolveFirstDose(custom, now), now);
  const close = (o: boolean) => { if (!o) setStep(1); onOpenChange(o); };

  return (
    <Dialog
      narrow open={open} onOpenChange={close} title={step === 1 ? "Em que dia?" : "A que horas?"}
      footer={
        step === 1 ? (
          <Button size="lg" onPress={() => setStep(2)} accessibilityLabel="Continuar">Continuar</Button>
        ) : (
          <View className="flex-row gap-2">
            <Button variant="outline" size="lg" onPress={() => setStep(1)} accessibilityLabel="Voltar ao calendário">Voltar</Button>
            <Button size="lg" className="flex-1" onPress={() => close(false)} accessibilityLabel={`Confirmar ${lower(when)}`}>{`Confirmar ${lower(when)}`}</Button>
          </View>
        )
      }
    >
      <View className="-mt-2 flex-row gap-1.5">
        <View className="h-1 flex-1 rounded-full bg-primary" />
        <View className={cn("h-1 flex-1 rounded-full", step === 2 ? "bg-primary" : "bg-border")} />
      </View>
      <Text className="-mt-2 text-xs font-semibold text-muted-foreground">{step === 1 ? "Passo 1 de 2" : `Passo 2 de 2 · ${shortDate(date)}`}</Text>
      {step === 1 ? <Calendar value={date} min={today} onChange={pickDate} /> : <View className="gap-3"><TimeWheels custom={custom} onChange={onChange} now={now} /></View>}
    </Dialog>
  );
}

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
  return (
    <View className="gap-3">
      <ChoiceCard title="Agora" subtitle={whenLabel(firstDoseAt("now", now), now)} selected={value.kind === "now"} onPress={() => onChange({ kind: "now" })} />
      <ChoiceCard title="Na próxima hora cheia" subtitle={whenLabel(firstDoseAt("nextHour", now), now)} selected={value.kind === "nextHour"} onPress={() => onChange({ kind: "nextHour" })} />
      <ChoiceCard
        title="Escolher o horário" selected={!!custom}
        onPress={() => { if (!custom) onChange(initialCustom(now)); if (wide) setDialog(true); }}
        subtitle={custom ? whenLabel(resolveFirstDose(custom, now), now) : "Hora e dia, num seletor fácil"}
      />
      {custom && wide ? <DoseDialog open={dialog} onOpenChange={setDialog} custom={custom} onChange={onChange} now={now} /> : null}
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
