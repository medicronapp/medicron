import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getItem } from "@/lib/services/items";
import { ItemForm } from "@/components/item-form";
import { Button } from "@/components/ui/button";
import { updateItemAction, archiveItemAction } from "../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const item = await getItem(getDb(), orgId, id);
  if (!item) notFound();
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">{item.name}</h1>
      <ItemForm item={item} action={updateItemAction.bind(null, item.id)} />
      <form action={archiveItemAction.bind(null, item.id)}>
        <Button type="submit" variant="outline" className="h-11 w-full text-destructive">Arquivar item</Button>
      </form>
    </div>
  );
}
