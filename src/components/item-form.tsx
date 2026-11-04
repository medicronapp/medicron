import type { Item } from "@/lib/db/schema";
import { FormField } from "@/components/form-field";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

export function ItemForm({
  item, defaultKind, action,
}: { item?: Item; defaultKind?: Item["kind"]; action: (f: FormData) => Promise<void> }) {
  const kind = item?.kind ?? defaultKind ?? "medication";
  return (
    <form action={action} className="grid gap-4">
      <FormField label="Tipo" htmlFor="kind">
        <NativeSelect id="kind" name="kind" defaultValue={kind}>
          <option value="medication">Medicação</option>
          <option value="procedure">Procedimento</option>
        </NativeSelect>
      </FormField>
      <FormField label="Nome" htmlFor="name" hint="Ex.: Amoxicilina, Medir temperatura, Limpar olho esquerdo">
        <Input id="name" name="name" required maxLength={80} defaultValue={item?.name} />
      </FormField>
      <FormField label="Dose / instrução padrão" htmlFor="defaultDose" hint="Opcional. Ex.: 1/2 comprimido, 0,5 ml">
        <Input id="defaultDose" name="defaultDose" maxLength={120} defaultValue={item?.defaultDose ?? ""} />
      </FormField>
      <FormField label="Observações" htmlFor="notes" hint="Opcional">
        <Textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} />
      </FormField>
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
