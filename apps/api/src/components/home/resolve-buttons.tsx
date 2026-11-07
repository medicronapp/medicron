"use client";
import { useState, useTransition } from "react";
import { Check, Loader2, SkipForward } from "lucide-react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { toast } from "sonner";
import { recordDoseAction } from "@/app/(app)/actions";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { toLocalInput } from "@/lib/time";

type Props = {
  planId: string; scheduledFor: string; kind: "medication" | "procedure"; reschedule: boolean;
  itemName: string; patientName: string; size?: "default" | "lg";
};

/** "Feito" e "Pular" de um horário. Procedimento pede valor/observação numa gaveta antes de registrar. */
export function ResolveButtons({ planId, scheduledFor, kind, reschedule, itemName, patientName, size = "lg" }: Props) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [nowTime, setNowTime] = useState("");
  const needsSheet = kind === "procedure" || reschedule;

  function submit(outcome: "done" | "skipped", extra?: { value?: string; note?: string; appliedTime?: string }) {
    start(async () => {
      const res = await recordDoseAction({ planId, scheduledFor, outcome, ...extra });
      if (res.recorded) toast.success(outcome === "done" ? "Registrado" : "Marcado como pulado");
      else if (res.reason === "too-early") toast.info("Este cuidado ainda não está na hora.");
      else if (res.reason === "invalid-time") { toast.error("Hora da aplicação inválida. Confira o horário."); return; }
      else toast.info("Este horário já tinha sido registrado por outra pessoa.");
      setOpen(false);
    });
  }

  return (
    <>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <Button size={size} disabled={pending} onClick={() => {
          if (!needsSheet) return submit("done");
          setNowTime(toLocalInput(new Date()).slice(11));
          setOpen(true);
        }}>
          {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
          Feito
        </Button>
        <Button size={size} variant="outline" disabled={pending} onClick={() => submit("skipped")}>
          <SkipForward aria-hidden />
          Pular
        </Button>
      </div>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerPrimitive.VirtualKeyboardProvider>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                submit("done", {
                  value: String(f.get("value") ?? ""), note: String(f.get("note") ?? ""),
                  appliedTime: reschedule ? String(f.get("appliedTime") ?? "") : undefined,
                });
              }}
              className="grid gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <DrawerHeader className="px-0">
                <DrawerTitle>{itemName}</DrawerTitle>
                <DrawerDescription>{patientName}{kind === "procedure" ? " · registre o resultado, se quiser." : ""}</DrawerDescription>
              </DrawerHeader>
              {reschedule && (
                <FormField label="Hora da aplicação" htmlFor={`time-${planId}-${scheduledFor}`} hint="Ajuste se a aplicação foi antes de você marcar.">
                  <Input id={`time-${planId}-${scheduledFor}`} name="appliedTime" type="time" required defaultValue={nowTime} />
                </FormField>
              )}
              {kind === "procedure" && (
                <>
                <FormField label="Valor" htmlFor={`value-${planId}-${scheduledFor}`} hint="Ex.: 38,7 °C — opcional">
                  <Input id={`value-${planId}-${scheduledFor}`} name="value" maxLength={60} autoComplete="off" />
                </FormField>
                <FormField label="Observação" htmlFor={`note-${planId}-${scheduledFor}`} hint="Opcional">
                  <Input id={`note-${planId}-${scheduledFor}`} name="note" maxLength={300} autoComplete="off" />
                </FormField>
                </>
              )}
              <DrawerFooter className="grid grid-cols-2 gap-2 px-0">
                <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" size="lg" disabled={pending}>Confirmar</Button>
              </DrawerFooter>
            </form>
          </DrawerPrimitive.VirtualKeyboardProvider>
        </DrawerContent>
      </Drawer>
    </>
  );
}
