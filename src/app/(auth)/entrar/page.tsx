"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/redirect";
import { FormField } from "@/components/form-field";
import { PasswordInput } from "@/components/password-input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function Form() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const { error } = await authClient.signIn.email({
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (error) {
      setError("E-mail ou senha incorretos.");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1>Entrar</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta para ver os cuidados de hoje.</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4">
        <FormField label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </FormField>
        <FormField label="Senha" htmlFor="password">
          <PasswordInput id="password" name="password" autoComplete="current-password" required />
        </FormField>
        {error && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 aria-hidden className="animate-spin" />}
          {loading ? "Entrando…" : "Entrar"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Primeira vez?{" "}
        <Link className="font-medium text-link underline-offset-4 hover:underline" href={`/cadastrar?next=${encodeURIComponent(next)}`}>
          Criar conta
        </Link>
      </p>
    </div>
  );
}

export default function Page() {
  return <Suspense><Form /></Suspense>;
}
