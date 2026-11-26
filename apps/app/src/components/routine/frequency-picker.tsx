import { useState } from "react";
import { View } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { FREQUENCY_CHIPS, frequencyChipFor } from "@medicron/shared";
import { splitInterval, UNIT_MINUTES, type Unit } from "@/lib/routine-form";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Icon } from "@/components/ui/icon";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Text } from "@/components/ui/text";

type Props = { value: number; onChange: (minutes: number) => void; error?: string };

const MAX_MINUTES = 60 * 24 * 365;
const UNITS = [{ key: "minutes", label: "Minutos" }, { key: "hours", label: "Horas" }, { key: "days", label: "Dias" }];

/** Quantas vezes: atalhos de um toque e, em "Outra…", um contador (minutos, horas ou dias). */
export function FrequencyPicker({ value, onChange, error }: Props) {
  const [custom, setCustom] = useState(() => frequencyChipFor(value) === null);
  const initial = splitInterval(value);
  const [unit, setUnit] = useState<Unit>(initial.unit);
  const [text, setText] = useState(String(initial.amount));

  const step = unit === "minutes" ? 5 : 1;
  const min = unit === "minutes" ? 5 : 1;
  const emit = (amount: number, u: Unit) => onChange(Number.isInteger(amount) && amount >= min ? amount * UNIT_MINUTES[u] : 0);
  const amount = Number(text);
  const canDecrease = Number.isInteger(amount) && amount - step >= min;
  const canIncrease = Number.isInteger(amount) && (amount + step) * UNIT_MINUTES[unit] <= MAX_MINUTES;

  const setAmount = (t: string) => { setText(t); emit(Number(t), unit); };
  const bump = (delta: number) => setAmount(String(Math.max(min, (Number.isInteger(amount) ? amount : 0) + delta)));
  const pickUnit = (key: string) => {
    const u = key as Unit;
    setUnit(u);
    emit(Number(text), u);
  };
  const openCustom = () => {
    const s = splitInterval(value);
    setUnit(s.unit);
    setText(String(s.amount));
    setCustom(true);
  };

  return (
    <View className="gap-3">
      <View className="flex-row flex-wrap gap-2">
        {FREQUENCY_CHIPS.map((c) => (
          <Chip key={c.id} label={c.label} selected={!custom && c.minutes === value} onPress={() => { setCustom(false); onChange(c.minutes); }} />
        ))}
        <Chip label="Outra…" selected={custom} onPress={openCustom} />
      </View>
      {custom ? (
        <View className="gap-3 rounded-2xl border border-border bg-card p-3">
          <View className="flex-row items-center justify-between gap-3">
            <Button variant="outline" size="icon" accessibilityLabel="Diminuir" disabled={!canDecrease} onPress={() => bump(-step)}><Icon icon={Minus} /></Button>
            <Input
              accessibilityLabel="Quantidade" value={text} onChangeText={setAmount} keyboardType="number-pad" maxLength={6}
              className="h-12 w-28 text-center text-xl font-semibold"
            />
            <Button variant="outline" size="icon" accessibilityLabel="Aumentar" disabled={!canIncrease} onPress={() => bump(step)}><Icon icon={Plus} /></Button>
          </View>
          <Segmented items={UNITS} value={unit} onChange={pickUnit} accessibilityLabel="Unidade" />
        </View>
      ) : null}
      {error ? <Text accessibilityRole="alert" className="text-xs font-medium text-destructive">{error}</Text> : null}
    </View>
  );
}
