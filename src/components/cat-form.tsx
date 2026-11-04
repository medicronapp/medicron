import type { Cat } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function CatForm({ cat, action }: { cat?: Cat; action: (f: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required maxLength={60} defaultValue={cat?.name} className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="birthDate">Nascimento (opcional)</Label>
        <Input id="birthDate" name="birthDate" type="date" defaultValue={cat?.birthDate ?? ""} className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="weightKg">Peso em kg (opcional)</Label>
        <Input id="weightKg" name="weightKg" inputMode="decimal" defaultValue={cat?.weightKg ?? ""} className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea id="notes" name="notes" defaultValue={cat?.notes ?? ""} />
      </div>
      <Button type="submit" className="h-11">Salvar</Button>
    </form>
  );
}
