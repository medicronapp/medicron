"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { orgSlug } from "@/lib/slug";
import { FormField } from "@/components/form-field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function Page() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const name = String(new FormData(e.currentTarget).get("name")).trim();
    const { data, error } = await authClient.organization.create({ name, slug: orgSlug(name) });
    if (error || !data) {
      setError("Não foi possível criar a conta.");
      setLoading(false);
      return;
    }
    await authClient.organization.setActive({ organizationId: data.id });
    router.push("/");
    router.refresh();
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-1.5">
        <h1>Nova conta</h1>
        <p className="text-sm text-muted-foreground">
          Cada conta tem seus próprios pacientes, itens e pessoas. Use uma para cada casa ou família.
        </p>
      </div>
      <form onSubmit={onSubmit} className="grid gap-4">
        <FormField label="Nome da conta" htmlFor="name" hint="Ex.: Casa da vovó">
          <Input id="name" name="name" required maxLength={60} />
        </FormField>
        {error && (
          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button type="submit" size="lg" disabled={loading}>
          {loading && <Loader2 aria-hidden className="animate-spin" />}
          Criar conta
        </Button>
      </form>
    </div>
  );
}
