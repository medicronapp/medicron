import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getCat } from "@/lib/services/cats";
import { listItems } from "@/lib/services/items";
import { PlanForm } from "@/components/plan-form";
import { createPlanAction } from "../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const db = getDb();
  const cat = await getCat(db, orgId, id);
  if (!cat) notFound();
  const items = await listItems(db, orgId);
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Nova rotina — {cat.name}</h1>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Cadastre antes uma medicação ou procedimento na aba Itens.</p>
      ) : (
        <PlanForm items={items} action={createPlanAction.bind(null, cat.id)} />
      )}
    </div>
  );
}
