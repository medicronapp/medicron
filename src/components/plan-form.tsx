import type { Item } from "@/lib/db/schema";
import { INTERVAL_PRESETS } from "@/lib/schedule";
import { toLocalInput } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PlanForm({ items, action }: { items: Item[]; action: (f: FormData) => Promise<void> }) {
  const meds = items.filter((i) => i.kind === "medication");
  const procs = items.filter((i) => i.kind === "procedure");
  const soon = new Date(Math.ceil(Date.now() / 900_000) * 900_000);
  const sel = "h-11 rounded-md border bg-background px-2";
  return (
    <form action={action} className="grid gap-4">
      <div className="grid gap-2">
        <Label htmlFor="itemId">Medicação ou procedimento</Label>
        <select id="itemId" name="itemId" required className={sel}>
          <option value="">Selecione…</option>
          {meds.length > 0 && <optgroup label="Medicações">{meds.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>}
          {procs.length > 0 && <optgroup label="Procedimentos">{procs.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>}
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="dose">Dose / instrução (opcional, usa a padrão do item)</Label>
        <Input id="dose" name="dose" maxLength={120} className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="intervalMinutes">Frequência</Label>
        <select id="intervalMinutes" name="intervalMinutes" defaultValue={480} className={sel}>
          {INTERVAL_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
          <option value={0}>Personalizada…</option>
        </select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="customHours">Se personalizada: a cada quantas horas?</Label>
        <Input id="customHours" name="customHours" inputMode="decimal" placeholder="Ex.: 5" className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="anchorAt">Horário da primeira dose</Label>
        <Input id="anchorAt" name="anchorAt" type="datetime-local" required defaultValue={toLocalInput(soon)} className="h-11" />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="endAt">Até quando? (opcional)</Label>
        <Input id="endAt" name="endAt" type="datetime-local" className="h-11" />
      </div>
      <Button type="submit" className="h-11">Salvar rotina</Button>
    </form>
  );
}
