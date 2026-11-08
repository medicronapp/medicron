import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { Text } from "@/components/ui/text";

type Props = { value: string; onChange: (value: string) => void; accessibilityLabel?: string };

const pad = (n: number) => String(n).padStart(2, "0");
// O seletor trabalha com horas do relógio do aparelho; usamos uma data qualquer só para carregar "HH:mm" (a hora é de Brasília).
const toDate = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return new Date(2000, 0, 1, h || 0, m || 0);
};
const toValue = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Campo de hora "HH:mm" com o seletor nativo (no navegador, `time-field.web.tsx`). */
export function TimeField({ value, onChange, accessibilityLabel }: Props) {
  if (Platform.OS === "android") {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${accessibilityLabel ?? "Hora"}: ${value}`}
        onPress={() =>
          DateTimePickerAndroid.open({
            mode: "time", is24Hour: true, value: toDate(value),
            onChange: (e, d) => { if (e.type === "set" && d) onChange(toValue(d)); },
          })
        }
        className="h-11 justify-center rounded-lg border border-input px-3"
      >
        <Text>{value}</Text>
      </Pressable>
    );
  }
  return (
    <View className="h-11 items-start justify-center">
      <DateTimePicker
        accessibilityLabel={accessibilityLabel}
        mode="time" display="compact" locale="pt-BR" value={toDate(value)}
        onChange={(_e, d) => { if (d) onChange(toValue(d)); }}
      />
    </View>
  );
}
