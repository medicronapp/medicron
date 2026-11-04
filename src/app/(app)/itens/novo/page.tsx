import { ItemForm } from "@/components/item-form";
import { PageHeader } from "@/components/page-header";
import { createItemAction } from "../actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const kind = tipo === "procedure" ? "procedure" : "medication";
  return (
    <div className="grid gap-5">
      <PageHeader title="Novo item" backHref={`/itens?tipo=${kind}`} />
      <ItemForm defaultKind={kind} action={createItemAction} />
    </div>
  );
}
