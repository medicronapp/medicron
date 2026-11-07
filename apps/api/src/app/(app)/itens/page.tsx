import { Pill, Stethoscope } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listItems } from "@/lib/services/items";
import { AddLink } from "@/components/add-link";
import { EmptyState } from "@/components/empty-state";
import { ItemCard } from "@/components/item-card";
import { PageHeader } from "@/components/page-header";
import { SegmentedLinks } from "@/components/segmented-links";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const kind = tipo === "procedure" ? "procedure" : "medication";
  const { orgId } = await getOrgContext();
  const items = await listItems(getDb(), orgId, kind);
  const add = <AddLink href={`/itens/novo?tipo=${kind}`} label="Novo" />;
  return (
    <div className="grid gap-5">
      <PageHeader title="Itens" description="Medicações e procedimentos que entram nas rotinas." actions={add} />
      <SegmentedLinks
        label="Tipo de item"
        items={[
          { href: "/itens?tipo=medication", label: "Medicações", active: kind === "medication" },
          { href: "/itens?tipo=procedure", label: "Procedimentos", active: kind === "procedure" },
        ]}
      />
      {items.length === 0 ? (
        <EmptyState
          icon={kind === "procedure" ? Stethoscope : Pill}
          title={kind === "procedure" ? "Nenhum procedimento" : "Nenhuma medicação"}
          description={kind === "procedure" ? "Ex.: medir temperatura, limpar um ferimento." : "Ex.: antibiótico, anti-inflamatório, vitamina."}
          action={add}
        />
      ) : (
        <ul className="grid gap-3">{items.map((i) => <li key={i.id}><ItemCard item={i} /></li>)}</ul>
      )}
    </div>
  );
}
