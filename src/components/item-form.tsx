import type { Item } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ItemForm({
  item, defaultKind, action,
}: { item?: Item; defaultKind?: Item["kind"]; action: (f: FormData) => Promise<void> }) {
  const kind = item?.kind ?? defaultKind ?? "medication";
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="kind">Tipo</Label>
        <select id="kind" name="kind" defaultValue={kind} className="h-11 rounded-md border bg-background px-2">
          <option value="medication">Medicação</option>
          <option value="procedure">Procedimento</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="name">Nome</Label>
        <Input id="name" name="name" required maxLength={80} defaultValue={item?.name}
          placeholder="Ex.: Amoxicilina, Medir temperatura, Limpar olho esquerdo" className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="defaultDose">Dose / instrução padrão (opcional)</Label>
        <Input id="defaultDose" name="defaultDose" maxLength={120} defaultValue={item?.defaultDose ?? ""}
          placeholder="Ex.: 1/2 comprimido, 0,5 ml" className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="notes">Observações (opcional)</Label>
        <Textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} />
      </div>
      <Button type="submit" className="h-11">Salvar</Button>
    </form>
  );
}
