"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { orgSlug } from "@/lib/slug";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Page() {
  const router = useRouter();
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    const { data, error } = await authClient.organization.create({ name, slug: orgSlug(name) });
    if (error || !data) return setError("Não foi possível criar a conta.");
    await authClient.organization.setActive({ organizationId: data.id });
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Nova conta</h2>
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da conta (ex.: Casa da vovó)</Label>
        <Input id="name" name="name" required maxLength={60} className="h-11" />
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11">Criar conta</Button>
    </form>
  );
}
