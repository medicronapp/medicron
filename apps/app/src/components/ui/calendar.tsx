import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { ChevronLeft, ChevronRight } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { todayLocal } from "@/lib/datetime-local";
import { Icon } from "./icon";
import { Text } from "./text";

type Props = { value: string; onChange: (date: string) => void; /** Primeiro dia permitido, "YYYY-MM-DD". */ min?: string };

const pad = (n: number) => String(n).padStart(2, "0");
const WEEKDAYS = ["D", "S", "T", "Q", "Q", "S", "S"];
const monthName = (y: number, m: number) => new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, 1)));
const longDate = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, d)));
};

/** Calendário de um mês (semana começa no domingo): navegar entre meses e tocar num dia. */
export function Calendar({ value, onChange, min }: Props) {
  const [month, setMonth] = useState(value.slice(0, 7));
  useEffect(() => { setMonth(value.slice(0, 7)); }, [value]);
  const today = todayLocal();
  const [y, m] = month.split("-").map(Number);
  const offset = new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array<null>(offset).fill(null), ...Array.from({ length: total }, (_, i) => i + 1)];
  while (cells.length % 7) cells.push(null);
  const rows = Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
  const shift = (delta: number) => {
    const d = new Date(Date.UTC(y, m - 1 + delta, 1));
    setMonth(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`);
  };
  const canGoBack = !min || month > min.slice(0, 7);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Pressable accessibilityRole="button" accessibilityLabel="Mês anterior" disabled={!canGoBack} onPress={() => shift(-1)} className={cn("size-10 items-center justify-center rounded-full active:bg-muted", !canGoBack && "opacity-30")}>
          <Icon icon={ChevronLeft} />
        </Pressable>
        <Text accessibilityRole="header" className="text-base font-semibold">{monthName(y, m)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Próximo mês" onPress={() => shift(1)} className="size-10 items-center justify-center rounded-full active:bg-muted">
          <Icon icon={ChevronRight} />
        </Pressable>
      </View>
      <View className="flex-row">
        {WEEKDAYS.map((w, i) => (
          <View key={i} className="h-8 flex-1 items-center justify-center"><Text className="text-xs font-medium text-muted-foreground">{w}</Text></View>
        ))}
      </View>
      {rows.map((row, ri) => (
        <View key={ri} className="flex-row">
          {row.map((day, ci) => {
            if (day === null) return <View key={ci} className="h-10 flex-1" />;
            const key = `${month}-${pad(day)}`;
            const selected = key === value;
            const isToday = key === today;
            const off = !!min && key < min;
            return (
              <View key={ci} className="h-10 flex-1 items-center justify-center">
                <Pressable
                  accessibilityRole="button" accessibilityLabel={`${longDate(key)}${isToday ? ", hoje" : ""}`} accessibilityState={{ selected, disabled: off }}
                  disabled={off} onPress={() => onChange(key)}
                  className={cn("size-10 items-center justify-center rounded-full", selected ? "bg-primary" : isToday ? "border border-primary active:bg-muted" : "active:bg-muted", off && "opacity-30")}
                >
                  <Text className={cn("text-sm", selected ? "font-bold text-primary-foreground" : "font-medium")}>{day}</Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}
