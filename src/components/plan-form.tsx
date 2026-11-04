import type { Item } from "@/lib/db/schema";
import { INTERVAL_PRESETS } from "@/lib/schedule";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-2xl border bg-card p-4">
      <legend className="px-1 text-sm font-semibold text-muted-foreground">{title}</legend>
      {children}
    </fieldset>
  );
}

export function PlanForm({ items, defaultAnchor, action }: {
  items: Item[]; defaultAnchor: string; action: (f: FormData) => Promise<void>;
}) {
  const meds = items.filter((i) => i.kind === "medication");
  const procs = items.filter((i) => i.kind === "procedure");
  return (
    <form action={action} className="grid gap-4">
      <Section title="O quê">
        <FormField label="Medicação ou procedimento" htmlFor="itemId">
          <NativeSelect id="itemId" name="itemId" required defaultValue="">
            <option value="">Selecione…</option>
            {meds.length > 0 && <optgroup label="Medicações">{meds.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>}
            {procs.length > 0 && <optgroup label="Procedimentos">{procs.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</optgroup>}
          </NativeSelect>
        </FormField>
        <FormField label="Dose / instrução" htmlFor="dose" hint="Opcional. Se vazio, usa a dose padrão do item.">
          <Input id="dose" name="dose" maxLength={120} />
        </FormField>
      </Section>
      <Section title="Quando">
        <FormField label="Frequência" htmlFor="intervalMinutes">
          <NativeSelect id="intervalMinutes" name="intervalMinutes" defaultValue={480}>
            {INTERVAL_PRESETS.map((p) => <option key={p.minutes} value={p.minutes}>{p.label}</option>)}
            <option value={0}>Personalizada…</option>
          </NativeSelect>
        </FormField>
        <FormField label="Se personalizada: a cada quantas horas?" htmlFor="customHours" hint="Ex.: 5">
          <Input id="customHours" name="customHours" inputMode="decimal" />
        </FormField>
        <FormField label="Horário da primeira dose" htmlFor="anchorAt" hint="Horário de Brasília. Os próximos seguem a frequência a partir daqui.">
          <Input id="anchorAt" name="anchorAt" type="datetime-local" required defaultValue={defaultAnchor} />
        </FormField>
      </Section>
      <Section title="Até quando">
        <FormField label="Data final" htmlFor="endAt" hint="Opcional. Deixe vazio para um uso contínuo.">
          <Input id="endAt" name="endAt" type="datetime-local" />
        </FormField>
      </Section>
      <SubmitButton>Salvar rotina</SubmitButton>
    </form>
  );
}
