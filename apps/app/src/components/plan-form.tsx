import { useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import type { ItemDto, PlanCreateBody } from "@medicron/shared";
import { addDays, dayKey, dayLabel, parseLocalInput } from "@medicron/shared";
import { now as clockNow } from "@/lib/clock";
import { resolveEnd, resolveFirstDose, shortDate, type Duration, type FirstDose } from "@/lib/routine-form";
import { DurationPicker } from "@/components/routine/duration-picker";
import { FirstDosePicker } from "@/components/routine/first-dose-picker";
import { FrequencyPicker } from "@/components/routine/frequency-picker";
import { RoutinePreview } from "@/components/routine/routine-preview";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

type Props = { items: ItemDto[]; onSubmit: (body: PlanCreateBody) => Promise<void> };
type Errors = { item?: string; interval?: string; end?: string; start?: string };

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text accessibilityRole="header" className="text-sm font-semibold text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}

/** "hoje às 12:07" / "amanhã às 08:00" / "em 01/12 às 20:00". */
export function startPhrase(startLocal: string, now: Date): string {
  const day = dayLabel(parseLocalInput(startLocal), now);
  return `${day.includes("/") ? `em ${day}` : day} às ${startLocal.slice(11)}`;
}

/** Nova rotina numa tela só: o quê, quantas vezes, primeira dose e por quanto tempo, com a prévia do resultado. */
export function PlanForm({ items, onSubmit }: Props) {
  const [itemId, setItemId] = useState("");
  const [dose, setDose] = useState("");
  const [minutes, setMinutes] = useState(480);
  const [firstDose, setFirstDose] = useState<FirstDose>({ kind: "now" });
  const [duration, setDuration] = useState<Duration>({ kind: "none" });
  const [reschedule, setReschedule] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false); // dois toques seguidos enviam uma vez só

  const options = [
    ...items.filter((i) => i.kind === "medication").map((i) => ({ value: i.id, label: i.name, group: "Medicações" })),
    ...items.filter((i) => i.kind === "procedure").map((i) => ({ value: i.id, label: i.name, group: "Procedimentos" })),
  ];
  const itemName = items.find((i) => i.id === itemId)?.name ?? "";

  const now = clockNow();
  const startLocal = resolveFirstDose(firstDose, now);
  const endLocal = resolveEnd(duration, startLocal);
  const validInterval = Number.isInteger(minutes) && minutes >= 5 && minutes <= 60 * 24 * 365;
  const summaryDuration = duration.kind === "days" ? { days: duration.days } : duration.kind === "until" ? { until: shortDate(duration.date) } : null;

  async function submit() {
    if (busy.current) return;
    const at = clockNow();
    const start = resolveFirstDose(firstDose, at);
    const end = resolveEnd(duration, start);
    const next: Errors = {};
    if (!itemId) next.item = "Selecione o item";
    if (!validInterval) next.interval = "Informe um intervalo entre 5 minutos e 1 ano";
    if (firstDose.kind === "custom" && parseLocalInput(start).getTime() < at.getTime() - 60_000) next.start = "Esse horário já passou. Escolha outro.";
    if (end && parseLocalInput(end).getTime() <= parseLocalInput(start).getTime()) next.end = "A data final precisa ser depois da primeira dose";
    setErrors(next);
    if (Object.keys(next).length) return;

    busy.current = true;
    setPending(true);
    try {
      await onSubmit({
        itemId, intervalMinutes: minutes, anchorAt: parseLocalInput(start).toISOString(),
        ...(end ? { endAt: parseLocalInput(end).toISOString() } : {}),
        ...(dose.trim() ? { dose: dose.trim() } : {}),
        reschedule,
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <View className="gap-6">
      <Section title="O quê">
        <FormField label="Medicação ou procedimento" error={errors.item}>
          <SelectField value={itemId} onChange={setItemId} options={options} placeholder="Selecione…" />
        </FormField>
        <FormField label="Dose / instrução" hint="Opcional. Se vazio, usa a dose padrão do item.">
          <Input value={dose} onChangeText={setDose} maxLength={120} autoComplete="off" />
        </FormField>
      </Section>
      <Section title="Quantas vezes?">
        <FrequencyPicker value={minutes} onChange={setMinutes} error={errors.interval} />
      </Section>
      <Section title="Primeira dose">
        <FirstDosePicker value={firstDose} onChange={setFirstDose} now={now} />
        {errors.start ? <Text accessibilityRole="alert" className="text-xs font-medium text-destructive">{errors.start}</Text> : null}
      </Section>
      <Section title="Por quanto tempo?">
        <DurationPicker value={duration} onChange={setDuration} defaultUntil={addDays(dayKey(parseLocalInput(startLocal)), 6)} />
        {errors.end ? <Text accessibilityRole="alert" className="text-xs font-medium text-destructive">{errors.end}</Text> : null}
      </Section>
      {validInterval ? (
        <RoutinePreview
          name={itemName} intervalMinutes={minutes} anchor={parseLocalInput(startLocal)} from={parseLocalInput(startLocal)}
          endAt={endLocal ? parseLocalInput(endLocal) : null} now={now} duration={summaryDuration}
          detail={`Começa ${startPhrase(startLocal, now)}${endLocal ? ` · termina em ${shortDate(endLocal)}` : ""}`}
        />
      ) : null}
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-medium">Ajustar se eu atrasar</Text>
          <Text className="text-sm text-muted-foreground">Se uma dose atrasar, as próximas acompanham a hora real em que você aplicou.</Text>
        </View>
        <Switch value={reschedule} onValueChange={setReschedule} accessibilityLabel="Ajustar se eu atrasar" />
      </View>
      <Button size="lg" loading={pending} onPress={() => void submit()} accessibilityLabel="Salvar rotina">Salvar rotina</Button>
    </View>
  );
}
