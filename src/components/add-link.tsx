import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

/** Botão de "novo/adicionar" que leva a outra página; é o mesmo do cabeçalho de Itens e Gatos. */
export function AddLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={cn(buttonVariants())}>
      <Plus aria-hidden /> {label}
    </Link>
  );
}
