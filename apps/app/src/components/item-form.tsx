import { useState } from "react";
import { View } from "react-native";
import type { ItemBody, ItemDto } from "@medicron/shared";
import { FormSection } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Textarea } from "@/components/ui/textarea";

type Props = { item?: ItemDto; defaultKind?: ItemDto["kind"]; onSubmit: (body: ItemBody) => Promise<void>; submitting?: boolean };

/** Formulário de item (criar e editar). Valida o nome no cliente e só manda o que foi preenchido. */
export function ItemForm({ item, defaultKind, onSubmit, submitting }: Props) {
  const [kind, setKind] = useState<ItemDto["kind"]>(item?.kind ?? defaultKind ?? "medication");
  const [name, setName] = useState(item?.name ?? "");
  const [dose, setDose] = useState(item?.defaultDose ?? "");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [nameError, setNameError] = useState("");

  async function submit() {
    const trimmed = name.trim();
    setNameError(trimmed ? "" : "Informe o nome");
    if (!trimmed) return;
    await onSubmit({
      name: trimmed, kind,
      ...(dose.trim() ? { defaultDose: dose.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
    });
  }

  return (
    <View className="gap-4">
      <FormSection title="O que é">
        <FormField label="Tipo">
          <Segmented
            accessibilityLabel="Tipo" value={kind} onChange={(k) => setKind(k as ItemDto["kind"])}
            items={[{ key: "medication", label: "Medicação" }, { key: "procedure", label: "Procedimento" }]}
          />
        </FormField>
        <FormField label="Nome" hint="Ex.: Amoxicilina, Medir temperatura, Limpar olho esquerdo" error={nameError}>
          <Input value={name} onChangeText={setName} maxLength={80} autoCapitalize="sentences" returnKeyType="next" />
        </FormField>
      </FormSection>
      <FormSection title="Detalhes">
        <FormField label="Dose / instrução padrão" hint="Opcional. Ex.: 1/2 comprimido, 0,5 ml">
          <Input value={dose} onChangeText={setDose} maxLength={120} autoComplete="off" />
        </FormField>
        <FormField label="Observações" hint="Opcional">
          <Textarea value={notes} onChangeText={setNotes} maxLength={1000} />
        </FormField>
      </FormSection>
      <Button size="lg" disabled={submitting} loading={submitting} onPress={() => void submit()} accessibilityLabel="Salvar">Salvar</Button>
    </View>
  );
}
