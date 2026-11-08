import { Pressable, View } from "react-native";
import { Check, Flame, Minus, TriangleAlert } from "lucide-react-native";
import type { HomeDto } from "@medicron/shared";
import { weekdayShort } from "@medicron/shared";
import { cn } from "@/lib/cn";
import { HeroCard } from "@/components/ui/hero-card";
import { Icon } from "@/components/ui/icon";
import { ProgressRing } from "@/components/progress-ring";
import { Text } from "@/components/ui/text";

type WeekDay = HomeDto["week"][number];
type Props = {
  streak: HomeDto["streak"]; week: WeekDay[]; progress: HomeDto["progress"]; closedToday: boolean; riskCount: number;
  onSelectDay: (key: string, isToday: boolean) => void;
};

const WEEKDAY_LONG: Record<string, string> = {
  dom: "domingo", seg: "segunda", ter: "terça", qua: "quarta", qui: "quinta", sex: "sexta", "sáb": "sábado",
};
const STATUS_TEXT: Record<WeekDay["status"], string> = {
  ok: "em dia", open: "em andamento", pending: "pendente", lost: "dose sem solução", empty: "sem cuidados", future: "",
};

const TONE: Record<WeekDay["status"], string> = {
  ok: "bg-success", lost: "bg-warning", pending: "bg-destructive-soft", future: "bg-white/10", open: "bg-white/20", empty: "bg-white/20",
};

function Glyph({ status }: { status: WeekDay["status"] }) {
  if (status === "ok") return <Icon icon={Check} color="successForeground" size={16} />;
  if (status === "lost") return <Icon icon={TriangleAlert} color="warningForeground" size={16} />;
  if (status === "pending") return <Text className="text-xs font-bold text-destructive-ink">!</Text>;
  if (status === "open") return <Text className="text-[10px] font-bold text-white">hoje</Text>;
  if (status === "future") return null;
  return <Icon icon={Minus} color="#ffffff" size={12} />;
}

function Cell({ day, onPress }: { day: WeekDay; onPress: () => void }) {
  const short = weekdayShort(day.key);
  const label = `${WEEKDAY_LONG[short]}, ${Number(day.key.slice(8))}: ${day.isToday ? "hoje, " : ""}${STATUS_TEXT[day.status]}`;
  const box = (
    <View className={cn("h-11 items-center justify-center rounded-lg", TONE[day.status], day.isToday && "border-2 border-hero-accent")}>
      <Glyph status={day.status} />
    </View>
  );
  return (
    <View className="flex-1 gap-1">
      <Text accessibilityElementsHidden importantForAccessibility="no-hide-descendants" className="text-center text-[11px] text-white/85">{short}</Text>
      {day.status === "future" ? box : (
        <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}>{box}</Pressable>
      )}
    </View>
  );
}

/** Cartão verde da sequência: dias seguidos, progresso de hoje, aviso de risco e a semana (cada dia abre aquele dia). */
export function StreakCard({ streak, week, progress, closedToday, riskCount, onSelectDay }: Props) {
  const title =
    streak.days === 0 ? "Comece sua sequência: feche o dia de hoje"
    : streak.days === 1 ? "1 dia em dia"
    : `${streak.days} dias seguidos em dia`;
  return (
    <HeroCard accessibilityLabel="Sequência">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Icon icon={Flame} color="#ffffff" size={20} />
            <Text className="flex-1 text-base font-semibold text-white">{title}</Text>
          </View>
          {closedToday ? (
            <Text className="mt-1 text-sm font-medium text-white">Dia fechado!</Text>
          ) : progress.total > 0 ? (
            <Text className="mt-1 text-sm text-white/85">Faltam {progress.total - progress.resolved} para fechar hoje</Text>
          ) : null}
        </View>
        <ProgressRing resolved={progress.resolved} total={progress.total} />
      </View>
      {streak.atRisk && riskCount > 0 ? (
        <Text accessibilityRole="alert" className="rounded-lg bg-white/15 px-3 py-2 text-sm text-white">
          Ontem tem {riskCount} {riskCount === 1 ? "dose" : "doses"} sem registro: resolva até hoje 23:59 para manter a sequência
        </Text>
      ) : null}
      <View accessibilityLabel="Semana" className="flex-row gap-1.5">
        {week.map((d) => <Cell key={d.key} day={d} onPress={() => onSelectDay(d.key, d.isToday)} />)}
      </View>
    </HeroCard>
  );
}
