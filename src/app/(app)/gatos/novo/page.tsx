import { CatForm } from "@/components/cat-form";
import { PageHeader } from "@/components/page-header";
import { createCatAction } from "../actions";

export default function Page() {
  return (
    <div className="grid gap-5">
      <PageHeader title="Novo gato" backHref="/gatos" />
      <CatForm action={createCatAction} />
    </div>
  );
}
