import { useRef, useState } from "react";
import { View } from "react-native";
import type { ItemBody, ItemDto } from "@medicron/shared";
import { errorMessage } from "@/lib/api/errors";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

type Props = { onCreate: (body: ItemBody) => Promise<ItemDto>; onCreated: (item: ItemDto) => void; onCancel?: () => void; title?: string };

/** Mini formulário para criar um item (medicação ou procedimento) sem sair da tela da rotina. */
export function NewItemInline({ onCreate, onCreated, onCancel, title }: Props) {
  const [kind, setKind] = useState<ItemDto["kind"]>("medication");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const busy = useRef(false); // dois toques seguidos criam uma vez só

  async function submit() {
    if (busy.current) return;
    const trimmed = name.trim();
    setError(trimmed ? "" : "Informe o nome");
    if (!trimmed) return;
    busy.current = true;
    setPending(true);
    try {
      onCreated(await onCreate({ name: trimmed, kind }));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <View className="gap-3 rounded-2xl border border-border bg-card p-3">
      {title ? <Text className="text-sm font-semibold">{title}</Text> : null}
      <Segmented
        accessibilityLabel="Tipo" value={kind} onChange={(k) => setKind(k as ItemDto["kind"])}
        items={[{ key: "medication", label: "Medicação" }, { key: "procedure", label: "Procedimento" }]}
      />
      <FormField label="Nome do item" hint="Ex.: Amoxicilina, Medir temperatura, Limpar o ferimento" error={error}>
        <Input value={name} onChangeText={setName} maxLength={80} autoCapitalize="sentences" returnKeyType="done" onSubmitEditing={() => void submit()} />
      </FormField>
      <View className="flex-row gap-2">
        {onCancel ? <Button variant="outline" size="lg" className="flex-1" onPress={onCancel} accessibilityLabel="Cancelar">Cancelar</Button> : null}
        <Button size="lg" className="flex-1" loading={pending} onPress={() => void submit()} accessibilityLabel="Criar item">Criar item</Button>
      </View>
    </View>
  );
}
