"use client";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recordDoseAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export type DoseCardProps = {
  planId: string; scheduledFor: string; catName: string; itemName: string; dose: string | null;
  kind: "medication" | "procedure"; timeLabel: string; tone: "overdue" | "now" | "upcoming";
};

export function DoseCard(p: DoseCardProps) {
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);

  function submit(outcome: "done" | "skipped", extra?: { value?: string; note?: string }) {
    start(async () => {
      const res = await recordDoseAction({ planId: p.planId, scheduledFor: p.scheduledFor, outcome, ...extra });
      if (res.recorded) toast.success(outcome === "done" ? "Registrado ✔" : "Marcado como pulado");
      else toast.info("Este horário já tinha sido registrado por outra pessoa.");
      setOpen(false);
    });
  }

  return (
    <div className={cn("grid gap-3 rounded-xl border p-4", p.tone === "overdue" && "border-destructive/60 bg-destructive/5", p.tone === "now" && "border-primary bg-primary/5")}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-lg font-semibold">🐱 {p.catName}</div>
          <div>{p.itemName}{p.dose ? ` — ${p.dose}` : ""}</div>
        </div>
        <div className={cn("text-right text-sm", p.tone === "overdue" ? "font-semibold text-destructive" : "text-muted-foreground")}>
          {p.timeLabel}
        </div>
      </div>
      {p.tone !== "upcoming" && !open && (
        <div className="grid grid-cols-2 gap-2">
          <Button className="h-12 text-base" disabled={pending}
            onClick={() => (p.kind === "procedure" ? setOpen(true) : submit("done"))}>
            Feito
          </Button>
          <Button variant="outline" className="h-12 text-base" disabled={pending} onClick={() => submit("skipped")}>
            Pular
          </Button>
        </div>
      )}
      {open && (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            submit("done", { value: String(f.get("value") ?? ""), note: String(f.get("note") ?? "") });
          }}
        >
          <Input name="value" placeholder="Valor (ex.: 38,7 °C) — opcional" className="h-11" />
          <Input name="note" placeholder="Observação — opcional" className="h-11" />
          <div className="grid grid-cols-2 gap-2">
            <Button type="submit" className="h-12" disabled={pending}>Confirmar</Button>
            <Button type="button" variant="outline" className="h-12" onClick={() => setOpen(false)}>Voltar</Button>
          </div>
        </form>
      )}
    </div>
  );
}
