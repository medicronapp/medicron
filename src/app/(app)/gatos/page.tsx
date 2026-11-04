import Link from "next/link";
import { Cat, Plus } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listCats } from "@/lib/services/cats";
import { cn } from "@/lib/utils";
import { CatCard } from "@/components/cat-card";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

export default async function Page() {
  const { orgId } = await getOrgContext();
  const cats = await listCats(getDb(), orgId);
  const add = (
    <Link href="/gatos/novo" className={cn(buttonVariants())}><Plus aria-hidden /> Novo gato</Link>
  );
  return (
    <div className="grid gap-5">
      <PageHeader title="Gatos" description={cats.length ? `${cats.length} ${cats.length === 1 ? "gato" : "gatos"} nesta conta` : undefined} actions={add} />
      {cats.length === 0 ? (
        <EmptyState icon={Cat} title="Nenhum gato cadastrado" description="Cadastre o primeiro para montar a rotina de cuidados." action={add} />
      ) : (
        <ul className="grid gap-3">
          {cats.map((c) => <li key={c.id}><CatCard cat={c} /></li>)}
        </ul>
      )}
    </div>
  );
}
