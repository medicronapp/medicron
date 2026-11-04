import type { Cat } from "@/lib/db/schema";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export function CatForm({ cat, action }: { cat?: Cat; action: (f: FormData) => Promise<void> }) {
  return (
    <form action={action} className="grid gap-4">
      <FormField label="Nome" htmlFor="name">
        <Input id="name" name="name" required maxLength={60} defaultValue={cat?.name} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Nascimento" htmlFor="birthDate" hint="Opcional">
          <Input id="birthDate" name="birthDate" type="date" defaultValue={cat?.birthDate ?? ""} />
        </FormField>
        <FormField label="Peso (kg)" htmlFor="weightKg" hint="Opcional">
          <Input id="weightKg" name="weightKg" inputMode="decimal" placeholder="4,2" defaultValue={cat?.weightKg ?? ""} />
        </FormField>
      </div>
      <FormField label="Observações" htmlFor="notes" hint="Opcional: alergias, temperamento, veterinário…">
        <Textarea id="notes" name="notes" defaultValue={cat?.notes ?? ""} />
      </FormField>
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
