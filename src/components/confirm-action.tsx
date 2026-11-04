"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  triggerLabel: string; title: string; description: string; confirmLabel: string;
  action: () => Promise<void>; triggerVariant?: React.ComponentProps<typeof Button>["variant"];
  triggerSize?: React.ComponentProps<typeof Button>["size"]; triggerClassName?: string;
};

/** Botão que abre um diálogo de confirmação antes de executar uma Server Action. */
export function ConfirmAction({
  triggerLabel, title, description, confirmLabel, action,
  triggerVariant = "destructive", triggerSize = "default", triggerClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={triggerVariant} size={triggerSize} className={triggerClassName} onClick={() => setOpen(true)}>
        {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <form action={action}>
            <DialogFooter className="grid grid-cols-2 gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Cancelar</Button>
              <SubmitButton variant="destructive" pendingLabel="Aguarde…">{confirmLabel}</SubmitButton>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
