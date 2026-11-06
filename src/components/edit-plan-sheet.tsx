"use client";
import { useState, useTransition } from "react";
import { Loader2, Pencil } from "lucide-react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { toast } from "sonner";
import { updatePlanAction } from "@/app/(app)/gatos/[id]/rotina/actions";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toLocalInput } from "@/lib/time";

type Props = {
  planId: string; itemName: string; catName: string;
  dose: string | null; endAt: string | null; reschedule: boolean;
};

/** Botão "Editar" de uma rotina: abre um sheet com dose, data final e reprogramação de horários. */
export function EditPlanSheet({ planId, itemName, catName, dose, endAt, reschedule }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const id = (name: string) => `${name}-${planId}`;

  return (
    <>
      <Button type="button" variant="outline" onClick={() => setOpen(true)}>
        <Pencil aria-hidden /> Editar
      </Button>
      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerPrimitive.VirtualKeyboardProvider>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                start(async () => {
                  const res = await updatePlanAction(planId, f);
                  if (res.error) return void toast.error(res.error);
                  toast.success("Rotina atualizada");
                  setOpen(false);
                });
              }}
              className="grid gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <DrawerHeader className="px-0">
                <DrawerTitle>{itemName}</DrawerTitle>
                <DrawerDescription>{catName} · editar rotina</DrawerDescription>
              </DrawerHeader>
              <FormField label="Dose / instrução" htmlFor={id("dose")} hint="Opcional.">
                <Input id={id("dose")} name="dose" maxLength={120} defaultValue={dose ?? ""} autoComplete="off" />
              </FormField>
              <FormField label="Data final" htmlFor={id("endAt")} hint="Opcional. Deixe vazio para um uso contínuo.">
                <Input id={id("endAt")} name="endAt" type="datetime-local" defaultValue={endAt ? toLocalInput(new Date(endAt)) : ""} />
              </FormField>
              <div className="flex items-start justify-between gap-4">
                <div className="grid gap-1">
                  <Label htmlFor={id("reschedule")}>Reprogramar horários</Label>
                  <p className="text-sm text-muted-foreground">
                    Se uma dose atrasar, as próximas acompanham a hora real da aplicação.
                  </p>
                </div>
                <Switch id={id("reschedule")} name="reschedule" value="on" defaultChecked={reschedule} />
              </div>
              <DrawerFooter className="grid grid-cols-2 gap-2 px-0">
                <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" size="lg" disabled={pending}>
                  {pending && <Loader2 aria-hidden className="animate-spin" />}
                  Salvar
                </Button>
              </DrawerFooter>
            </form>
          </DrawerPrimitive.VirtualKeyboardProvider>
        </DrawerContent>
      </Drawer>
    </>
  );
}
