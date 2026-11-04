import { ItemForm } from "@/components/item-form";
import { createItemAction } from "../actions";

export default async function Page({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Novo item</h1>
      <ItemForm defaultKind={tipo === "procedure" ? "procedure" : "medication"} action={createItemAction} />
    </div>
  );
}
