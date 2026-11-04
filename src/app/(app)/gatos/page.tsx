import Link from "next/link";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listCats } from "@/lib/services/cats";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

export default async function Page() {
  const { orgId } = await getOrgContext();
  const cats = await listCats(getDb(), orgId);
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Gatos</h1>
        <Link href="/gatos/novo" className={cn(buttonVariants(), "h-11")}>+ Novo gato</Link>
      </div>
      {cats.length === 0 && <p className="text-muted-foreground">Nenhum gato cadastrado ainda.</p>}
      {cats.map((c) => (
        <Link key={c.id} href={`/gatos/${c.id}`}>
          <Card><CardContent className="flex items-center gap-3 py-4">
            <span className="text-2xl">🐱</span>
            <span className="text-lg font-medium">{c.name}</span>
          </CardContent></Card>
        </Link>
      ))}
    </div>
  );
}
