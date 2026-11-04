"use client";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="grid gap-4">
      <Alert variant="destructive">
        <TriangleAlert aria-hidden />
        <AlertTitle>Algo deu errado</AlertTitle>
        <AlertDescription>Não foi possível carregar esta tela. Tente novamente em instantes.</AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={reset}>Tentar de novo</Button>
        <Link href="/" className={cn(buttonVariants({ variant: "outline" }))}>Ir para o início</Link>
      </div>
    </div>
  );
}
