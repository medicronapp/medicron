import { useState } from "react";
import { View } from "react-native";
import { CircleStop, Pencil, Pill, Stethoscope } from "lucide-react-native";
import type { PlanDto } from "@medicron/shared";
import { formatDateTime, intervalLabel, nextSlotAfter } from "@medicron/shared";
import { now } from "@/lib/clock";
import { useDeactivatePlan } from "@/lib/patient-queries";
import { ConfirmSheet } from "@/components/confirm-sheet";
import { EditPlanSheet } from "@/components/edit-plan-sheet";
import { ListRow } from "@/components/list-row";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

/** Uma rotina do paciente: item, dose, frequência, próxima dose e os botões Editar e Encerrar. */
export function PlanRow({ plan, patientName }: { plan: PlanDto; patientName: string }) {
  const [editing, setEditing] = useState(false);
  const [ending, setEnding] = useState(false);
  const deactivate = useDeactivatePlan();
  const name = plan.item?.name ?? "Rotina";
  const next = nextSlotAfter(new Date(plan.anchorAt), plan.intervalMinutes, now());

  return (
    <>
      <ListRow
        icon={plan.item?.kind === "procedure" ? Stethoscope : Pill}
        title={name}
        subtitle={plan.dose ?? undefined}
        trailing={
          <>
            <Button variant="outline" size="icon" accessibilityLabel="Editar" onPress={() => setEditing(true)}>
              <Icon icon={Pencil} color="foreground" size={16} />
            </Button>
            <Button variant="outline" size="icon" accessibilityLabel="Encerrar" onPress={() => setEnding(true)}>
              <Icon icon={CircleStop} color="foreground" size={16} />
            </Button>
          </>
        }
      >
        <View className="mt-1.5 flex-row flex-wrap items-center gap-x-2 gap-y-1">
          <Badge variant="secondary">{intervalLabel(plan.intervalMinutes)}</Badge>
          <Text className="text-xs text-muted-foreground">{`próxima ${formatDateTime(next)}`}</Text>
        </View>
      </ListRow>
      <EditPlanSheet plan={plan} patientName={patientName} open={editing} onOpenChange={setEditing} />
      <ConfirmSheet
        open={ending} onOpenChange={setEnding}
        title={`Encerrar ${name}?`}
        description={`Os lembretes de ${name} para ${patientName} serão interrompidos. O histórico é mantido.`}
        confirmLabel="Encerrar rotina"
        onConfirm={async () => { await deactivate.mutateAsync(plan.id); }}
      />
    </>
  );
}
