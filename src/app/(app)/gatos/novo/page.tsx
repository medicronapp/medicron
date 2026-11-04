import { CatForm } from "@/components/cat-form";
import { createCatAction } from "../actions";

export default function Page() {
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-semibold">Novo gato</h1>
      <CatForm action={createCatAction} />
    </div>
  );
}
