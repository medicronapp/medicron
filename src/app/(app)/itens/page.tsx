import Link from "next/link";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listItems } from "@/lib/services/items";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  const kind = tipo === "procedure" ? "procedure" : "medication";
  const { orgId } = await getOrgContext();
  const items = await listItems(getDb(), orgId, kind);
  const tabs = [
    { k: "medication", label: "Medicações" },
    { k: "procedure", label: "Procedimentos" },
  ];
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Itens</h1>
        <Link href={`/itens/novo?tipo=${kind}`} className={cn(buttonVariants(), "h-11")}>+ Novo</Link>
      </div>
      <div className="grid grid-cols-2 rounded-lg bg-muted p-1">
        {tabs.map((t) => (
          <Link key={t.k} href={`/itens?tipo=${t.k}`}
            className={cn("rounded-md py-2.5 text-center text-sm", kind === t.k ? "bg-background font-semibold shadow-sm" : "text-muted-foreground")}>
            {t.label}
          </Link>
        ))}
      </div>
      {items.length === 0 && <p className="text-muted-foreground">Nada cadastrado nesta aba ainda.</p>}
      {items.map((i) => (
        <Link key={i.id} href={`/itens/${i.id}`}>
          <Card><CardContent className="py-4">
            <div className="text-lg font-medium">{i.name}</div>
            {i.defaultDose && <div className="text-sm text-muted-foreground">{i.defaultDose}</div>}
          </CardContent></Card>
        </Link>
      ))}
    </div>
  );
}
