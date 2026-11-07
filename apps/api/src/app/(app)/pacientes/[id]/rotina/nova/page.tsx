import Link from "next/link";
import { notFound } from "next/navigation";
import { Pill } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getPatient } from "@/lib/services/patients";
import { listItems } from "@/lib/services/items";
import { nextQuarterHourInput } from "@/lib/time";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { PlanForm } from "@/components/plan-form";
import { buttonVariants } from "@/components/ui/button";
import { createPlanAction } from "../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const db = getDb();
  const patient = await getPatient(db, orgId, id);
  if (!patient) notFound();
  const items = await listItems(db, orgId);
  return (
    <div className="grid gap-5">
      <PageHeader title="Nova rotina" description={patient.name} backHref={`/pacientes/${patient.id}`} />
      {items.length === 0 ? (
        <EmptyState
          icon={Pill}
          title="Cadastre um item primeiro"
          description="Você precisa de ao menos uma medicação ou procedimento para montar a rotina."
          action={<Link href="/itens/novo" className={cn(buttonVariants())}>Cadastrar item</Link>}
        />
      ) : (
        <PlanForm items={items} defaultAnchor={nextQuarterHourInput()} action={createPlanAction.bind(null, patient.id)} />
      )}
    </div>
  );
}
