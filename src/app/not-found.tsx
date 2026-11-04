import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <div className="grid w-full gap-4">
        <h1 className="sr-only">Página não encontrada</h1>
        <EmptyState
          icon={SearchX}
          title="Página não encontrada"
          description="O endereço não existe ou o item foi arquivado."
          action={<Link href="/" className={buttonVariants()}>Ir para o início</Link>}
        />
      </div>
    </main>
  );
}
