"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { safeNext } from "@/lib/redirect";
import { authClient } from "@/lib/auth-client";
import { orgSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Seu nome</Label>
        <Input id="name" name="name" autoComplete="name" required className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="password">Senha (mín. 8 caracteres)</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className="h-11" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="h-11">{loading ? "Criando…" : "Criar conta"}</Button>
      <p className="text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link className="underline" href={`/entrar?next=${encodeURIComponent(next)}`}>Entrar</Link>
      </p>
    </form>
  );
}

export default function Page() {
  return <Suspense><Form /></Suspense>;
}
