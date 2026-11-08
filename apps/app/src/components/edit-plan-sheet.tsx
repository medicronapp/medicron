import { useState } from "react";
import { View } from "react-native";
import { parseLocalInput, toLocalInput } from "@medicron/shared";
import type { PlanDto } from "@medicron/shared";
import { errorMessage } from "@/lib/api/errors";
import { useUpdatePlan } from "@/lib/patient-queries";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/datetime-field";
import { Drawer } from "@/components/ui/drawer";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

type Props = { plan: PlanDto; patientName: string; open: boolean; onOpenChange: (open: boolean) => void };

/** Edição de uma rotina: dose, data final e reprogramação de horários. */
export function EditPlanSheet({ plan, patientName, open, onOpenChange }: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} title={plan.item?.name ?? "Rotina"} description={`${patientName} · editar rotina`}>
      {/* O formulário só existe com o sheet aberto: cada abertura começa nos valores da rotina. */}
      {open ? <EditPlanForm plan={plan} onClose={() => onOpenChange(false)} /> : null}
    </Drawer>
  );
}

function EditPlanForm({ plan, onClose }: { plan: PlanDto; onClose: () => void }) {
  const update = useUpdatePlan();
  const [dose, setDose] = useState(plan.dose ?? "");
  // A data final aparece no relógio de Brasília.
  const [endAt, setEndAt] = useState(plan.endAt ? toLocalInput(new Date(plan.endAt)) : "");
  const [reschedule, setReschedule] = useState(plan.reschedule);
  const [pending, setPending] = useState(false);

  async function save() {
    if (pending) return;
    setPending(true);
    try {
      await update.mutateAsync({
        planId: plan.id,
        body: { dose: dose.trim() || null, endAt: endAt ? parseLocalInput(endAt).toISOString() : null, reschedule },
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
    <View className="gap-4">
      <FormField label="Dose / instrução" hint="Opcional.">
        <Input value={dose} onChangeText={setDose} maxLength={120} autoComplete="off" />
      </FormField>
      <FormField label="Data final" hint="Opcional. Deixe vazio para um uso contínuo.">
        <DateTimeField value={endAt} onChange={setEndAt} clearable />
      </FormField>
      <View className="flex-row items-start justify-between gap-4">
        <View className="min-w-0 flex-1 gap-1">
          <Text className="text-sm font-medium">Reprogramar horários</Text>
          <Text className="text-sm text-muted-foreground">Se uma dose atrasar, as próximas acompanham a hora real da aplicação.</Text>
        </View>
        <Switch value={reschedule} onValueChange={setReschedule} accessibilityLabel="Reprogramar horários" />
      </View>
      <View className="flex-row gap-2">
        <Button variant="outline" size="lg" className="flex-1" onPress={onClose}>Cancelar</Button>
        <Button size="lg" className="flex-1" loading={pending} onPress={() => void save()} accessibilityLabel="Salvar">Salvar</Button>
      </View>
    </View>
  );
}
