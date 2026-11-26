import { useState } from "react";
import { View } from "react-native";
import { addDays, dayKey, durationDaysFor, parseLocalInput, toLocalInput } from "@medicron/shared";
import type { PlanDto } from "@medicron/shared";
import { errorMessage } from "@/lib/api/errors";
import { now as clockNow } from "@/lib/clock";
import { resolveEnd, shortDate, type Duration } from "@/lib/routine-form";
import { useUpdatePlan } from "@/lib/patient-queries";
import { Section } from "@/components/plan-form";
import { DurationPicker } from "@/components/routine/duration-picker";
import { FrequencyPicker } from "@/components/routine/frequency-picker";
import { RoutinePreview } from "@/components/routine/routine-preview";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

type Props = { plan: PlanDto; patientName: string; open: boolean; onOpenChange: (open: boolean) => void };

/** Edição de uma rotina com os mesmos controles de criar: frequência, duração, dose e ajuste de horários. */
export function EditPlanSheet({ plan, patientName, open, onOpenChange }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} scrollable title={plan.item?.name ?? "Rotina"} description={`${patientName} · editar rotina`}>
      {/* O formulário só existe com o sheet aberto: cada abertura começa nos valores da rotina. */}
      {open ? <EditPlanForm plan={plan} onClose={() => onOpenChange(false)} /> : null}
    </Drawer>
  );
}

/** Duração atual da rotina: contínuo, um atalho de dias (contados a partir de hoje) ou uma data. */
function currentDuration(plan: PlanDto, todayStart: string): Duration {
  if (!plan.endAt) return { kind: "none" };
  const end = toLocalInput(new Date(plan.endAt));
  const days = durationDaysFor(todayStart, end);
  return days ? { kind: "days", days } : { kind: "until", date: end.slice(0, 10) };
}

function EditPlanForm({ plan, onClose }: { plan: PlanDto; onClose: () => void }) {
  const update = useUpdatePlan();
  const now = clockNow();
  const nowLocal = toLocalInput(now);
  const [minutes, setMinutes] = useState(plan.intervalMinutes);
  const [dose, setDose] = useState(plan.dose ?? "");
  const [duration, setDuration] = useState<Duration>(() => currentDuration(plan, nowLocal));
  const [durationTouched, setDurationTouched] = useState(false);
  const [reschedule, setReschedule] = useState(plan.reschedule);
  const [intervalError, setIntervalError] = useState("");
  const [pending, setPending] = useState(false);

  const validInterval = Number.isInteger(minutes) && minutes >= 5 && minutes <= 60 * 24 * 365;
  // Sem mexer na duração, a data final volta exatamente como estava (hora incluída).
  const endLocal = durationTouched ? resolveEnd(duration, nowLocal) : plan.endAt ? toLocalInput(new Date(plan.endAt)) : null;
  const endAt = durationTouched ? (endLocal ? parseLocalInput(endLocal) : null) : plan.endAt ? new Date(plan.endAt) : null;
  const summaryDuration = duration.kind === "days" ? { days: duration.days } : duration.kind === "until" ? { until: shortDate(duration.date) } : null;

  async function save() {
    if (pending) return;
    if (!validInterval) {
      setIntervalError("Informe um intervalo entre 5 minutos e 1 ano");
      return;
    }
    setIntervalError("");
    setPending(true);
    try {
      await update.mutateAsync({
        planId: plan.id,
        body: {
          // Só vai no corpo se mudou: trocar a frequência refaz os horários futuros.
          ...(minutes !== plan.intervalMinutes ? { intervalMinutes: minutes } : {}),
          dose: dose.trim() || null, endAt: endAt ? endAt.toISOString() : null, reschedule,
        },
      });
      toast.success("Rotina atualizada");
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <View className="gap-6">
      <Section title="Quantas vezes?">
        <FrequencyPicker value={minutes} onChange={setMinutes} error={intervalError} />
        <Text className="text-xs text-muted-foreground">Os próximos horários seguem o horário da primeira dose desta rotina.</Text>
      </Section>
      <Section title="Por quanto tempo?">
        <DurationPicker
          value={duration} onChange={(d) => { setDuration(d); setDurationTouched(true); }}
          defaultUntil={addDays(dayKey(now), 6)}
        />
      </Section>
      <FormField label="Dose / instrução" hint="Opcional.">
        <Input value={dose} onChangeText={setDose} maxLength={120} autoComplete="off" />
      </FormField>
      {validInterval ? (
        <RoutinePreview
          name={plan.item?.name ?? ""} intervalMinutes={minutes} anchor={new Date(plan.anchorAt)} from={new Date(now.getTime() + 1)}
          endAt={endAt} now={now} duration={summaryDuration}
        />
      ) : null}
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-medium">Ajustar se eu atrasar</Text>
          <Text className="text-sm text-muted-foreground">Se uma dose atrasar, as próximas acompanham a hora real em que você aplicou.</Text>
        </View>
        <Switch value={reschedule} onValueChange={setReschedule} accessibilityLabel="Ajustar se eu atrasar" />
      </View>
      <View className="flex-row gap-2">
        <Button variant="outline" size="lg" className="flex-1" onPress={onClose}>Cancelar</Button>
        <Button size="lg" className="flex-1" loading={pending} onPress={() => void save()} accessibilityLabel="Salvar">Salvar</Button>
      </View>
    </View>
  );
}
