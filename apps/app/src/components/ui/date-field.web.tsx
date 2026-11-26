import { useState } from "react";
import { Pressable } from "react-native";
import { CalendarDays } from "lucide-react-native";
import { brDate, todayLocal } from "@/lib/datetime-local";
import { Calendar } from "./calendar";
import { Dialog } from "./dialog";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = { value: string; onChange: (v: string) => void; clearable?: boolean; accessibilityLabel?: string };

/** No navegador: botão com a data que abre um calendário num diálogo (em vez do campo nativo do navegador). */
export function DateField({ value, onChange, accessibilityLabel }: Props) {
  const [open, setOpen] = useState(false);
  const label = accessibilityLabel ?? "Data";
  return (
    <>
      <Pressable
        accessibilityRole="button" accessibilityLabel={`${label}: ${value ? brDate(value) : "Selecionar"}`} onPress={() => setOpen(true)}
        className="h-11 flex-row items-center gap-2 self-start rounded-lg border border-input px-3"
      >
        <Icon icon={CalendarDays} color="muted" size={16} />
        <Text className="text-base">{value ? brDate(value) : "Selecionar"}</Text>
      </Pressable>
      <Dialog narrow open={open} onOpenChange={setOpen} title="Escolha o dia">
        <Calendar value={value || todayLocal()} min={todayLocal()} onChange={(d) => { onChange(d); setOpen(false); }} />
      </Dialog>
    </>
  );
}
