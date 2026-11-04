"use client";
import { useState, useTransition } from "react";
import { Check, Loader2, Pill, SkipForward, Stethoscope } from "lucide-react";
import { toast } from "sonner";
import { recordDoseAction } from "@/app/(app)/actions";
import { FormField } from "@/components/form-field";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import {
  Drawer, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DoseCardProps = {
  planId: string; scheduledFor: string; catName: string; itemName: string; dose: string | null;
  kind: "medication" | "procedure"; timeLabel: string; relative: string; tone: "overdue" | "now" | "upcoming";
};

const STRIPE: Record<DoseCardProps["tone"], string> = {
  overdue: "before:bg-destructive",
  now: "before:bg-warning",
  upcoming: "before:bg-info",
};

export function DoseCard(p: DoseCardProps) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const Icon = p.kind === "procedure" ? Stethoscope : Pill;

  function submit(outcome: "done" | "skipped", extra?: { value?: string; note?: string }) {
    start(async () => {
      const res = await recordDoseAction({ planId: p.planId, scheduledFor: p.scheduledFor, outcome, ...extra });
      if (res.recorded) toast.success(outcome === "done" ? "Registrado" : "Marcado como pulado");
      else toast.info("Este horário já tinha sido registrado por outra pessoa.");
      setOpen(false);
    });
  }

  return (
    <article
      className={cn(
        "relative grid gap-3 overflow-hidden rounded-2xl border bg-card p-4 pl-5 shadow-xs",
        "before:absolute before:inset-y-0 before:left-0 before:w-1.5",
        STRIPE[p.tone],
      )}
    >
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
          <Icon aria-hidden className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold">{p.catName}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">
            {p.itemName}{p.dose ? ` · ${p.dose}` : ""}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-lg leading-none font-semibold tabular-nums">{p.timeLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">{p.relative}</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge tone={p.tone} />
      </div>
      {p.tone !== "upcoming" && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button size="lg" disabled={pending} onClick={() => (p.kind === "procedure" ? setOpen(true) : submit("done"))}>
            {pending ? <Loader2 aria-hidden className="animate-spin" /> : <Check aria-hidden />}
            Feito
          </Button>
          <Button size="lg" variant="outline" disabled={pending} onClick={() => submit("skipped")}>
            <SkipForward aria-hidden />
            Pular
          </Button>
        </div>
      )}

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              submit("done", { value: String(f.get("value") ?? ""), note: String(f.get("note") ?? "") });
            }}
            className="grid gap-4 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
          >
            <DrawerHeader className="px-0">
              <DrawerTitle>{p.itemName}</DrawerTitle>
              <DrawerDescription>{p.catName} · registre o resultado, se quiser.</DrawerDescription>
            </DrawerHeader>
            <FormField label="Valor" htmlFor={`value-${p.planId}`} hint="Ex.: 38,7 °C — opcional">
              <Input id={`value-${p.planId}`} name="value" maxLength={60} autoComplete="off" />
            </FormField>
            <FormField label="Observação" htmlFor={`note-${p.planId}`} hint="Opcional">
              <Input id={`note-${p.planId}`} name="note" maxLength={300} autoComplete="off" />
            </FormField>
            <DrawerFooter className="grid grid-cols-2 gap-2 px-0">
              <Button type="button" variant="outline" size="lg" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" disabled={pending}>Confirmar</Button>
            </DrawerFooter>
          </form>
        </DrawerContent>
      </Drawer>
    </article>
  );
}
