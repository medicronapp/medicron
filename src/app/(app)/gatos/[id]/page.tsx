import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { getCat } from "@/lib/services/cats";
import { CatForm } from "@/components/cat-form";
import { Button } from "@/components/ui/button";
import { updateCatAction, archiveCatAction } from "../actions";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { orgId } = await getOrgContext();
  const cat = await getCat(getDb(), orgId, id);
  if (!cat) notFound();
  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">🐱 {cat.name}</h1>
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
