"use client";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";
import { setRescheduleAction } from "@/app/(app)/gatos/[id]/rotina/actions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Liga/desliga "Reprogramar horários" de uma rotina existente; salva ao alternar. */
export function RescheduleToggle({ planId, checked }: { planId: string; checked: boolean }) {
  const [pending, start] = useTransition();
  const [value, setValue] = useOptimistic(checked);
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={`reschedule-${planId}`} className="text-xs text-muted-foreground">Reprogramar horários</Label>
      <Switch
        id={`reschedule-${planId}`} size="sm" checked={value} disabled={pending}
        onCheckedChange={(next) =>
          start(async () => {
            setValue(next);
            try {
              await setRescheduleAction(planId, next);
            } catch {
              toast.error("Não foi possível salvar. Tente de novo.");
            }
          })
        }
      />
    </div>
  );
}
