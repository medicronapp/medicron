import { Platform, Pressable, View } from "react-native";
import DateTimePicker, { DateTimePickerAndroid } from "@react-native-community/datetimepicker";
import { brDate, dateFromParts, datePart, nowLocal, timePart } from "@/lib/datetime-local";
import { Text } from "./text";

type Props = { value: string; onChange: (value: string) => void; clearable?: boolean; accessibilityLabel?: string };

const Link = ({ label, onPress }: { label: string; onPress: () => void }) => (
  <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} className="h-11 justify-center rounded-lg border border-input px-3">
    <Text className="text-base">{label}</Text>
  </Pressable>
);

/** Campo de data e hora "YYYY-MM-DDTHH:mm" (Brasília) com seletores nativos (no navegador, `datetime-field.web.tsx`). */
export function DateTimeField({ value, onChange, clearable, accessibilityLabel }: Props) {
  if (!value) return <View className="flex-row"><Link label="Selecionar" onPress={() => onChange(nowLocal())} /></View>;
  const [date, time] = value.split("T");
  const asDate = dateFromParts(date, time);
  const label = accessibilityLabel ?? "Data e hora";
  return (
    <View className="min-h-11 flex-row flex-wrap items-center gap-3">
      {Platform.OS === "android" ? (
        <>
          <Pressable
            accessibilityRole="button" accessibilityLabel={`${label}, data: ${brDate(date)}`}
            onPress={() => DateTimePickerAndroid.open({ mode: "date", value: asDate, onChange: (e, d) => { if (e.type === "set" && d) onChange(`${datePart(d)}T${time}`); } })}
            className="h-11 justify-center rounded-lg border border-input px-3"
          >
            <Text className="text-base">{brDate(date)}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button" accessibilityLabel={`${label}, hora: ${time}`}
            onPress={() => DateTimePickerAndroid.open({ mode: "time", is24Hour: true, value: asDate, onChange: (e, d) => { if (e.type === "set" && d) onChange(`${date}T${timePart(d)}`); } })}
            className="h-11 justify-center rounded-lg border border-input px-3"
          >
            <Text className="text-base">{time}</Text>
          </Pressable>
        </>
      ) : (
        <>
          <DateTimePicker accessibilityLabel={`${label}, data`} mode="date" display="compact" locale="pt-BR" value={asDate} onChange={(_e, d) => { if (d) onChange(`${datePart(d)}T${time}`); }} />
          <DateTimePicker accessibilityLabel={`${label}, hora`} mode="time" display="compact" locale="pt-BR" value={asDate} onChange={(_e, d) => { if (d) onChange(`${date}T${timePart(d)}`); }} />
        </>
      )}
      {clearable ? <Link label="Limpar" onPress={() => onChange("")} /> : null}
    </View>
  );
}
