"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Check } from "lucide-react";
import { dismissChecklistAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import type { ChecklistSteps } from "@/lib/services/onboarding";

const STEPS: { key: keyof ChecklistSteps; label: string; href: string }[] = [
  { key: "patient", label: "Cadastrar um paciente", href: "/pacientes/novo" },
  { key: "item", label: "Cadastrar uma medicação ou procedimento", href: "/itens/novo" },
  { key: "plan", label: "Montar a rotina", href: "/pacientes" },
  { key: "push", label: "Ativar os avisos no celular", href: "/conta" },
];

/** Checklist de primeiros passos: marcado pelo uso real; Dispensar (ou Concluir, com tudo feito) esconde para sempre. */
export function FirstStepsCard({ steps }: { steps: ChecklistSteps }) {
  const [hidden, setHidden] = useState(false);
  const [pending, start] = useTransition();
  if (hidden) return null;
  const done = STEPS.filter((s) => steps[s.key]).length;
  const all = done === STEPS.length;

  function close() {
    setHidden(true);
    start(async () => { await dismissChecklistAction(); });
  }

  return (
    <section aria-label="Primeiros passos" className="grid gap-3 rounded-2xl border border-brand/20 bg-brand-soft p-4 text-brand-ink">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base">Primeiros passos</h2>
        <span className="text-sm font-medium tabular-nums">{done}/{STEPS.length}</span>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={STEPS.length} aria-valuenow={done} aria-label="Progresso" className="h-1.5 rounded-full bg-brand/20">
        <div className="h-full rounded-full bg-brand transition-all" style={{ width: `${(done / STEPS.length) * 100}%` }} />
      </div>
      <ul className="grid gap-1">
        {STEPS.map((s) => {
          const ok = steps[s.key];
          const mark = (
            <span aria-hidden className={ok ? "flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground" : "size-5 shrink-0 rounded-full border-2 border-brand/40"}>
              {ok && <Check className="size-3" />}
            </span>
          );
          return (
            <li key={s.key}>
              {ok ? (
                <span className="flex min-h-9 items-center gap-2.5 text-sm text-brand-ink/70 line-through">{mark}{s.label}</span>
              ) : (
                <Link href={s.href} className="flex min-h-11 items-center gap-2.5 rounded-lg text-sm font-medium hover:underline">{mark}{s.label}</Link>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex justify-end">
        {all ? (
          <Button size="sm" onClick={close} disabled={pending}>Concluir</Button>
        ) : (
          <Button size="sm" variant="ghost" onClick={close} disabled={pending}>Dispensar</Button>
        )}
      </div>
    </section>
  );
}
