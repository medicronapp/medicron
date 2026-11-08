import { useRef, useState, type ReactNode } from "react";
import { View } from "react-native";
import type { ItemDto, PlanCreateBody } from "@medicron/shared";
import { INTERVAL_PRESETS, parseLocalInput } from "@medicron/shared";
import { Button } from "@/components/ui/button";
import { DateTimeField } from "@/components/ui/datetime-field";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";

const CUSTOM = "0";
const MIN_MINUTES = 5;
const MAX_MINUTES = 60 * 24 * 365;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-2xl border border-border bg-card p-4">
      <Text className="px-1 text-sm font-semibold text-muted-foreground">{title}</Text>
      {children}
    </View>
  );
}

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
  const intervalOptions = [
    ...INTERVAL_PRESETS.map((p) => ({ value: String(p.minutes), label: p.label })),
    { value: CUSTOM, label: "Personalizada…" },
  ];

  async function submit() {
    if (busy.current) return;
    const next: Errors = {};
    if (!itemId) next.item = "Selecione o item";
    let minutes = Number(interval);
    if (interval === CUSTOM) {
      minutes = Math.round(Number(customHours.replace(",", ".")) * 60);
      if (!Number.isFinite(minutes) || minutes < MIN_MINUTES || minutes > MAX_MINUTES) next.interval = "Informe um intervalo entre 5 minutos e 1 ano";
    }
    setErrors(next);
    if (Object.keys(next).length) return;

    busy.current = true;
    setPending(true);
    try {
      await onSubmit({
        itemId, intervalMinutes: minutes, anchorAt: parseLocalInput(anchor).toISOString(),
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
      <Section title="O quê">
        <FormField label="Medicação ou procedimento" error={errors.item}>
          <SelectField value={itemId} onChange={setItemId} options={options} placeholder="Selecione…" />
        </FormField>
        <FormField label="Dose / instrução" hint="Opcional. Se vazio, usa a dose padrão do item.">
          <Input value={dose} onChangeText={setDose} maxLength={120} autoComplete="off" />
        </FormField>
      </Section>
      <Section title="Quando">
        <FormField label="Frequência">
          <SelectField value={interval} onChange={setInterval} options={intervalOptions} />
        </FormField>
        <FormField label="Se personalizada: a cada quantas horas?" hint="Ex.: 5" error={errors.interval}>
          <Input value={customHours} onChangeText={setCustomHours} keyboardType="decimal-pad" />
        </FormField>
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
      </Section>
      <Section title="Até quando">
        <FormField label="Data final" hint="Opcional. Deixe vazio para um uso contínuo.">
          <DateTimeField value={endAt} onChange={setEndAt} clearable />
        </FormField>
      </Section>
      <Button size="lg" loading={pending} onPress={() => void submit()} accessibilityLabel="Salvar rotina">Salvar rotina</Button>
    </View>
  );
}
