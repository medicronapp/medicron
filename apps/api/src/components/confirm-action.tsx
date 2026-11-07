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
  /** Se informado, o gatilho vira um botão só de ícone (triggerLabel passa a ser o nome acessível). */
  triggerIcon?: React.ReactNode;
};

/** Botão que abre um diálogo de confirmação antes de executar uma Server Action. */
export function ConfirmAction({
  triggerLabel, title, description, confirmLabel, action,
  triggerVariant = "destructive", triggerSize = "default", triggerClassName, triggerIcon,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        type="button" variant={triggerVariant} size={triggerIcon ? "icon" : triggerSize} className={triggerClassName}
        aria-label={triggerIcon ? triggerLabel : undefined} onClick={() => setOpen(true)}
      >
        {triggerIcon ?? triggerLabel}
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
