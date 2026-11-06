import { notFound } from "next/navigation";
import { CalendarClock, CircleStop, Pill, Stethoscope } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getCat } from "@/lib/services/cats";
import { listPlansForCat } from "@/lib/services/plans";
import { nextSlotAfter } from "@/lib/schedule";
import { formatDateTime, intervalLabel } from "@/lib/time";
import { AddLink } from "@/components/add-link";
import { CatForm } from "@/components/cat-form";
import { ConfirmAction } from "@/components/confirm-action";
import { EditPlanSheet } from "@/components/edit-plan-sheet";
import { EmptyState } from "@/components/empty-state";
import { ListRow } from "@/components/list-row";
import { PageHeader } from "@/components/page-header";
import { SegmentedLinks } from "@/components/segmented-links";
import { Badge } from "@/components/ui/badge";
import { archiveCatAction, updateCatAction } from "../actions";
import { deactivatePlanAction } from "./rotina/actions";

export default async function Page({
  params, searchParams,
}: { params: Promise<{ id: string }>; searchParams: Promise<{ aba?: string }> }) {
  const [{ id }, { aba }] = await Promise.all([params, searchParams]);
  const tab = aba === "dados" ? "dados" : "rotina";
  const { orgId } = await getOrgContext();
  const db = getDb();
  const cat = await getCat(db, orgId, id);
  if (!cat) notFound();
  const plans = tab === "rotina" ? await listPlansForCat(db, orgId, cat.id) : [];
  const now = new Date();
  const add = <AddLink href={`/gatos/${cat.id}/rotina/nova`} label="Adicionar" />;

  return (
    <div className="grid gap-5">
      <PageHeader title={cat.name} backHref="/gatos" actions={tab === "rotina" ? add : undefined} />
      <SegmentedLinks
        label="Seções do gato"
        items={[
          { href: `/gatos/${cat.id}?aba=dados`, label: "Dados", active: tab === "dados" },
          { href: `/gatos/${cat.id}?aba=rotina`, label: "Rotina", active: tab === "rotina" },
        ]}
      />

      {tab === "dados" ? (
        <div className="grid gap-8">
          <CatForm cat={cat} action={updateCatAction.bind(null, cat.id)} />
          <ConfirmAction
            triggerLabel="Arquivar gato" triggerSize="lg" triggerClassName="w-full"
            title={`Arquivar ${cat.name}?`}
            description="O gato some das listas e todas as rotinas dele são encerradas."
            confirmLabel="Arquivar"
            action={archiveCatAction.bind(null, cat.id)}
          />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState icon={CalendarClock} title="Sem rotina ainda" description="Associe uma medicação ou procedimento e defina a frequência." action={add} />
      ) : (
        <ul className="grid gap-3">
          {plans.map((p) => (
            <li key={p.id}>
              <ListRow
                icon={p.item.kind === "procedure" ? Stethoscope : Pill}
                title={p.item.name}
                subtitle={p.dose ?? undefined}
                trailing={
                  <>
                    <EditPlanSheet
                      planId={p.id} itemName={p.item.name} catName={cat.name}
                      dose={p.dose} endAt={p.endAt?.toISOString() ?? null} reschedule={p.reschedule}
                    />
                    <ConfirmAction
                      triggerLabel="Encerrar" triggerVariant="outline" triggerIcon={<CircleStop aria-hidden />}
                      title={`Encerrar ${p.item.name}?`}
                      description={`Os lembretes de ${p.item.name} para ${cat.name} serão interrompidos. O histórico é mantido.`}
                      confirmLabel="Encerrar rotina"
                      action={deactivatePlanAction.bind(null, cat.id, p.id)}
                    />
                  </>
                }
              >
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Badge variant="secondary">{intervalLabel(p.intervalMinutes)}</Badge>
                  <span className="text-xs text-muted-foreground">próxima {formatDateTime(nextSlotAfter(p.anchorAt, p.intervalMinutes, now))}</span>
                </div>
              </ListRow>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
