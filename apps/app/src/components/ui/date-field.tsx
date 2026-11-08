import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { brDate, dateFromParts, datePart, todayLocal } from "@/lib/datetime-local";
import { Text } from "./text";

type Props = { value: string; onChange: (value: string) => void; clearable?: boolean; accessibilityLabel?: string };

const Link = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="h-11 justify-center rounded-lg border border-input px-3">
    <Text className="text-base">{label}</Text>
  </Pressable>
);

/** Campo de data "YYYY-MM-DD" com o seletor nativo (no navegador, `date-field.web.tsx`). */
export function DateField({ value, onChange, clearable, accessibilityLabel }: Props) {
  if (!value) return <View className="flex-row"><Link label="Selecionar" onPress={() => onChange(todayLocal())} /></View>;
  return (
    <View className="min-h-11 flex-row items-center gap-3">
      {Platform.OS === "android" ? (
        <Pressable
          accessibilityRole="button" accessibilityLabel={`${accessibilityLabel ?? "Data"}: ${brDate(value)}`}
          onPress={() => DateTimePickerAndroid.open({ mode: "date", value: dateFromParts(value), onChange: (e, d) => { if (e.type === "set" && d) onChange(datePart(d)); } })}
          className="h-11 justify-center rounded-lg border border-input px-3"
        >
          <Text className="text-base">{brDate(value)}</Text>
        </Pressable>
      ) : (
        <DateTimePicker accessibilityLabel={accessibilityLabel} mode="date" display="compact" locale="pt-BR" value={dateFromParts(value)} onChange={(_e, d) => { if (d) onChange(datePart(d)); }} />
      )}
      {clearable ? <Link label="Limpar" onPress={() => onChange("")} /> : null}
    </View>
  );
}
