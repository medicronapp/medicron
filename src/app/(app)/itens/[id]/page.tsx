import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getItem } from "@/lib/services/items";
import { ConfirmAction } from "@/components/confirm-action";
import { ItemForm } from "@/components/item-form";
import { PageHeader } from "@/components/page-header";
import { archiveItemAction, updateItemAction } from "../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const item = await getItem(getDb(), orgId, id);
  if (!item) notFound();
  return (
    <div className="grid gap-8">
      <PageHeader title={item.name} backHref={`/itens?tipo=${item.kind}`} />
      <ItemForm item={item} action={updateItemAction.bind(null, item.id)} />
      <ConfirmAction
        triggerLabel="Arquivar item" triggerSize="lg" triggerClassName="w-full"
        title={`Arquivar ${item.name}?`}
        description="O item some das listas e as rotinas que o usam são encerradas."
        confirmLabel="Arquivar"
        action={archiveItemAction.bind(null, item.id)}
      />
    </div>
  );
}
