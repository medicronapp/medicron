import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Conteúdo padrão das telas de erro: um h1, mensagem em português e "Tentar de novo". */
export function ErrorView({ retry }: { retry: () => void }) {
  return (
    <div className="grid gap-4">
      <h1>Algo deu errado</h1>
      <Alert variant="destructive">
        <TriangleAlert aria-hidden />
        <AlertDescription>Não foi possível carregar esta tela. Tente novamente em instantes.</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={retry}>Tentar de novo</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Ir para o início</Link>
      </div>
    </div>
  );
}
