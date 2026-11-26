import { useRef, useState } from "react";
import { View } from "react-native";
import type { ItemDto, PlanCreateBody } from "@medicron/shared";
import { parseLocalInput } from "@medicron/shared";
import { INTERVAL_ERROR, resolveInterval } from "@/lib/interval";
import { FrequencyFields } from "@/components/frequency-fields";
import { FormSection } from "@/components/form-section";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/datetime-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

type Props = { items: ItemDto[]; defaultAnchor: string; onSubmit: (body: PlanCreateBody) => Promise<void> };
type Errors = { item?: string; interval?: string };

/** Formulário de nova rotina: o quê, quando e até quando. Valida no cliente e só manda o que foi preenchido. */
export function PlanForm({ items, defaultAnchor, onSubmit }: Props) {
  const [itemId, setItemId] = useState("");
  const [dose, setDose] = useState("");
  const [interval, setInterval] = useState("480");
  const [customHours, setCustomHours] = useState("");
  const [anchor, setAnchor] = useState(defaultAnchor);
  const [reschedule, setReschedule] = useState(false);
  const [endAt, setEndAt] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [pending, setPending] = useState(false);
  const busy = useRef(false); // dois toques seguidos enviam uma vez só

  const options = [
    ...items.filter((i) => i.kind === "medication").map((i) => ({ value: i.id, label: i.name, group: "Medicações" })),
    ...items.filter((i) => i.kind === "procedure").map((i) => ({ value: i.id, label: i.name, group: "Procedimentos" })),
  ];

  async function submit() {
    if (busy.current) return;
    const next: Errors = {};
    if (!itemId) next.item = "Selecione o item";
    const minutes = resolveInterval(interval, customHours);
    if (minutes === null) next.interval = INTERVAL_ERROR;
    setErrors(next);
    if (Object.keys(next).length) return;

    busy.current = true;
    setPending(true);
    try {
      await onSubmit({
        itemId, intervalMinutes: minutes as number, anchorAt: parseLocalInput(anchor).toISOString(),
        ...(endAt ? { endAt: parseLocalInput(endAt).toISOString() } : {}),
        ...(dose.trim() ? { dose: dose.trim() } : {}),
        reschedule,
      });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <View className="gap-4">
      <FormSection title="O quê">
        <FormField label="Medicação ou procedimento" error={errors.item}>
          <SelectField value={itemId} onChange={setItemId} options={options} placeholder="Selecione…" />
        </FormField>
        <FormField label="Dose / instrução" hint="Opcional. Se vazio, usa a dose padrão do item.">
          <Input value={dose} onChangeText={setDose} maxLength={120} autoComplete="off" />
        </FormField>
      </FormSection>
      <FormSection title="Quando">
        <FrequencyFields interval={interval} onIntervalChange={setInterval} customHours={customHours} onCustomHoursChange={setCustomHours} error={errors.interval} />
        <FormField label="Horário da primeira dose" hint="Horário de Brasília. Os próximos seguem a frequência a partir daqui.">
          <DateTimeField value={anchor} onChange={setAnchor} />
        </FormField>
        <View className="flex-row items-start justify-between gap-4">
          <View className="min-w-0 flex-1 gap-1">
            <Text className="text-sm font-medium">Reprogramar horários</Text>
            <Text className="text-sm text-muted-foreground">Se uma dose atrasar, as próximas acompanham a hora real da aplicação.</Text>
          </View>
          <Switch value={reschedule} onValueChange={setReschedule} accessibilityLabel="Reprogramar horários" />
        </View>
      </FormSection>
      <FormSection title="Até quando">
        <FormField label="Data final" hint="Opcional. Deixe vazio para um uso contínuo.">
          <DateTimeField value={endAt} onChange={setEndAt} clearable />
        </FormField>
      </FormSection>
      <Button size="lg" loading={pending} onPress={() => void submit()} accessibilityLabel="Salvar rotina">Salvar rotina</Button>
    </View>
  );
}
