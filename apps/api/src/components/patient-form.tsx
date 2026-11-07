import type { Patient } from "@/lib/db/schema";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { SPECIES } from "@/lib/species";
import { Textarea } from "@/components/ui/textarea";

export function PatientForm({ patient, action }: { patient?: Patient; action: (f: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-4">
      <FormField label="Nome" htmlFor="name">
        <Input id="name" name="name" required maxLength={60} defaultValue={patient?.name} />
      </FormField>
      <FormField label="Tipo" htmlFor="species">
        <NativeSelect id="species" name="species" required defaultValue={patient?.species ?? ""}>
          <option value="">Selecione…</option>
          {SPECIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </NativeSelect>
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nascimento" htmlFor="birthDate" hint="Opcional">
          <Input id="birthDate" name="birthDate" type="date" defaultValue={patient?.birthDate ?? ""} />
        </FormField>
        <FormField label="Peso (kg)" htmlFor="weightKg" hint="Opcional">
          <Input id="weightKg" name="weightKg" inputMode="decimal" placeholder="4,2" defaultValue={patient?.weightKg ?? ""} />
        </FormField>
      </div>
      <FormField label="Observações" htmlFor="notes" hint="Opcional: alergias, condições, responsável…">
        <Textarea id="notes" name="notes" defaultValue={patient?.notes ?? ""} />
      </FormField>
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
