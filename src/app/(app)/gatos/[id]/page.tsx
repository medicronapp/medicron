import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarClock, Pill, Plus, Stethoscope } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getCat } from "@/lib/services/cats";
import { listPlansForCat } from "@/lib/services/plans";
import { formatDateTime, intervalLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { CatForm } from "@/components/cat-form";
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { archiveCatAction, updateCatAction } from "../actions";
import { deactivatePlanAction } from "./rotina/actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const db = getDb();
  const cat = await getCat(db, orgId, id);
  if (!cat) notFound();
  const plans = await listPlansForCat(db, orgId, cat.id);
  const add = (
    <Link href={`/gatos/${cat.id}/rotina/nova`} className={cn(buttonVariants({ variant: plans.length ? "secondary" : "default" }))}>
      <Plus aria-hidden /> Adicionar
    </Link>
  );

  return (
    <div className="grid gap-8">
      <PageHeader title={cat.name} backHref="/gatos" />

      <section className="grid gap-3" aria-labelledby="rotina">
        <div className="flex items-center justify-between gap-2">
          <h2 id="rotina">Rotina</h2>
          {plans.length > 0 && add}
        </div>
        {plans.length === 0 ? (
          <EmptyState icon={CalendarClock} title="Sem rotina ainda" description="Associe uma medicação ou procedimento e defina a frequência." action={add} />
        ) : (
          <ul className="grid gap-2">
            {plans.map((p) => {
              const Icon = p.item.kind === "procedure" ? Stethoscope : Pill;
              return (
                <li key={p.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand-ink">
                    <Icon aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.item.name}</p>
                    {p.dose && <p className="truncate text-sm text-muted-foreground">{p.dose}</p>}
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <Badge variant="secondary">{intervalLabel(p.intervalMinutes)}</Badge>
                      <span className="text-xs text-muted-foreground">próxima {formatDateTime(p.nextDueAt)}</span>
                    </div>
                  </div>
                  <ConfirmAction
                    triggerLabel="Encerrar" triggerVariant="outline" triggerSize="sm"
                    title={`Encerrar ${p.item.name}?`}
                    description={`Os lembretes de ${p.item.name} para ${cat.name} serão interrompidos. O histórico é mantido.`}
                    confirmLabel="Encerrar rotina"
                    action={deactivatePlanAction.bind(null, cat.id, p.id)}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="grid gap-3" aria-labelledby="dados">
        <h2 id="dados">Dados</h2>
        <CatForm cat={cat} action={updateCatAction.bind(null, cat.id)} />
      </section>

      <ConfirmAction
        triggerLabel="Arquivar gato" triggerSize="lg" triggerClassName="w-full"
        title={`Arquivar ${cat.name}?`}
        description="O gato some das listas e todas as rotinas dele são encerradas."
        confirmLabel="Arquivar"
        action={archiveCatAction.bind(null, cat.id)}
      />
    </div>
  );
}
