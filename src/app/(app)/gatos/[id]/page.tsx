import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getCat } from "@/lib/services/cats";
import Link from "next/link";
import { listPlansForCat } from "@/lib/services/plans";
import { formatDateTime, intervalLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { CatForm } from "@/components/cat-form";
import { Button, buttonVariants } from "@/components/ui/button";
import { deactivatePlanAction } from "./rotina/actions";
import { updateCatAction, archiveCatAction } from "../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const cat = await getCat(getDb(), orgId, id);
  if (!cat) notFound();
  const plans = await listPlansForCat(getDb(), orgId, cat.id);
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">🐱 {cat.name}</h1>
      <section className="grid gap-2">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Rotina</h2>
          <Link href={`/gatos/${cat.id}/rotina/nova`} className={cn(buttonVariants({ variant: "secondary" }), "h-11")}>+ Adicionar</Link>
        </div>
        {plans.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma medicação ou procedimento associado.</p>}
        {plans.map((p) => (
          <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border p-3">
            <div>
              <div className="font-medium">{p.item.name}{p.dose ? ` — ${p.dose}` : ""}</div>
              <div className="text-sm text-muted-foreground">{intervalLabel(p.intervalMinutes)} · próxima {formatDateTime(p.nextDueAt)}</div>
            </div>
            <form action={deactivatePlanAction.bind(null, cat.id, p.id)}>
              <Button type="submit" variant="outline" size="sm" className="h-10">Encerrar</Button>
            </form>
          </div>
        ))}
      </section>
      <section>
        <h2 className="mb-2 font-medium">Dados</h2>
        <CatForm cat={cat} action={updateCatAction.bind(null, cat.id)} />
      </section>
      <form action={archiveCatAction.bind(null, cat.id)}>
        <Button type="submit" variant="outline" className="h-11 w-full text-destructive">Arquivar gato</Button>
      </form>
    </div>
  );
}
