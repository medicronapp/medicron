"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { safeNext } from "@/lib/redirect";
import { orgSlug } from "@/lib/slug";
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
    const name = String(f.get("name")).trim();
    const { error } = await authClient.signUp.email({
      name,
      email: String(f.get("email")),
      password: String(f.get("password")),
    });
    if (error) {
      setError(error.message ?? "Não foi possível criar a conta.");
      setLoading(false);
      return;
    }
    // Quem veio por convite entra na conta convidada; os demais ganham uma conta própria.
    if (!next.startsWith("/convite/")) {
      const orgName = `Casa de ${name.split(" ")[0]}`;
      const created = await authClient.organization.create({ name: orgName, slug: orgSlug(orgName) });
      if (created.error) {
        setError("Conta criada, mas não foi possível criar sua casa. Tente em Nova conta.");
        setLoading(false);
        return;
      }
    }
    router.push(next);
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1>Criar conta</h1>
        <p className="text-sm text-muted-foreground">Leva menos de um minuto. Depois é só cadastrar seus gatos.</p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4">
        <FormField label="Seu nome" htmlFor="name">
          <Input id="name" name="name" autoComplete="name" required />
        </FormField>
        <FormField label="E-mail" htmlFor="email">
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required />
        </FormField>
        <FormField label="Senha" htmlFor="password" hint="Mínimo de 8 caracteres.">
          <PasswordInput id="password" name="password" autoComplete="new-password" minLength={8} required />
        </FormField>
        {error && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 aria-hidden className="animate-spin" />}
          {loading ? "Criando…" : "Criar conta"}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link className="font-medium text-primary underline-offset-4 hover:underline" href={`/entrar?next=${encodeURIComponent(next)}`}>
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default function Page() {
  return <Suspense><Form /></Suspense>;
}
