import { INTERVAL_PRESETS } from "@medicron/shared";
import { CUSTOM_INTERVAL } from "@/lib/interval";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SelectField } from "@/components/ui/select-field";

type Props = {
  interval: string; onIntervalChange: (v: string) => void;
  customHours: string; onCustomHoursChange: (v: string) => void;
  error?: string; hint?: string;
};

const OPTIONS = [
  ...INTERVAL_PRESETS.map((p) => ({ value: String(p.minutes), label: p.label })),
  { value: CUSTOM_INTERVAL, label: "Personalizada…" },
];

/** Frequência de uma rotina: atalhos ou "Personalizada" (em horas). Usado ao criar e ao editar. */
export function FrequencyFields({ interval, onIntervalChange, customHours, onCustomHoursChange, error, hint }: Props) {
  return (
    <>
      <FormField label="Frequência" hint={hint}>
        <SelectField value={interval} onChange={onIntervalChange} options={OPTIONS} />
      </FormField>
      <FormField label="Se personalizada: a cada quantas horas?" hint="Ex.: 5" error={error}>
        <Input value={customHours} onChangeText={onCustomHoursChange} keyboardType="decimal-pad" />
      </FormField>
    </>
  );
}
