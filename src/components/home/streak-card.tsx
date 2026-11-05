import Link from "next/link";
import { Check, Flame, Minus, TriangleAlert } from "lucide-react";
import type { DayStatus } from "@/lib/completeness";
import { weekdayShort } from "@/lib/time";
import { cn } from "@/lib/utils";

type WeekDay = { key: string; status: DayStatus | "future"; isToday: boolean };
type Props = {
  streak: { days: number; atRisk: boolean; pendingKeys: string[] };
  week: WeekDay[]; progress: { resolved: number; total: number }; closedToday: boolean; riskCount: number;
};

const WEEKDAY_LONG: Record<string, string> = {
  dom: "domingo", seg: "segunda", ter: "terça", qua: "quarta", qui: "quinta", sex: "sexta", "sáb": "sábado",
};
const STATUS_TEXT: Record<DayStatus | "future", string> = {
  ok: "em dia", open: "em andamento", pending: "pendente", lost: "dose sem solução", empty: "sem cuidados", future: "",
};

function Cell({ day }: { day: WeekDay }) {
  const short = weekdayShort(day.key);
  const label = `${WEEKDAY_LONG[short]}, ${Number(day.key.slice(8))}: ${day.isToday ? "hoje, " : ""}${STATUS_TEXT[day.status]}`;
  const icon =
    day.status === "ok" ? <Check aria-hidden className="size-4" />
    : day.status === "lost" ? <TriangleAlert aria-hidden className="size-4" />
    : day.status === "pending" ? <span aria-hidden>!</span>
    : day.status === "open" ? <span aria-hidden className="text-[0.65rem]">hoje</span>
    : <Minus aria-hidden className="size-3 opacity-60" />;
  const tone =
    day.status === "ok" ? "bg-success text-success-foreground"
    : day.status === "lost" ? "bg-warning text-warning-foreground"
    : day.status === "pending" ? "bg-destructive-soft text-destructive-ink"
    : day.status === "future" ? "bg-white/10 text-white/50"
    : "bg-white/20 text-white";
  const box = (
    <span className={cn("flex h-11 items-center justify-center rounded-lg text-xs font-bold", tone, day.isToday && "ring-2 ring-white/70")}>
      {day.status === "future" ? "" : icon}
    </span>
  );
  return (
    <li className="grid gap-1 text-center text-[0.7rem] text-white/85">
      <span aria-hidden>{short}</span>
      {day.status === "future" ? box : (
        <Link href={day.isToday ? "/" : `/?dia=${day.key}`} aria-label={label} className="rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-white/80">
          {box}
        </Link>
      )}
    </li>
  );
}

export function StreakCard({ streak, week, progress, closedToday, riskCount }: Props) {
  const title =
    streak.days === 0 ? "Comece sua sequência: feche o dia de hoje"
    : streak.days === 1 ? "1 dia em dia"
    : `${streak.days} dias seguidos em dia`;
  const pct = progress.total === 0 ? 0 : Math.round((progress.resolved / progress.total) * 100);
  return (
    <section aria-label="Sequência" className="grid gap-3 rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.36_0.08_200)] p-4 text-primary-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-base font-semibold">
            <Flame aria-hidden className="size-5 shrink-0" />
            <span>{title}</span>
          </p>
          {closedToday ? (
            <p className="mt-1 text-sm font-medium">Dia fechado!</p>
          ) : (
            progress.total > 0 && <p className="mt-1 text-sm text-primary-foreground/85">Faltam {progress.total - progress.resolved} para fechar hoje</p>
          )}
        </div>
        <div
          role="img" aria-label={`${progress.resolved} de ${progress.total} cuidados de hoje resolvidos`}
          className="flex size-16 shrink-0 items-center justify-center rounded-full"
          style={{ background: `conic-gradient(#fff ${pct}%, rgba(255,255,255,.25) 0)` }}
        >
          <span className="flex size-12 items-center justify-center rounded-full bg-primary text-sm font-semibold tabular-nums">
            {progress.resolved}/{progress.total}
          </span>
        </div>
      </div>
      {streak.atRisk && riskCount > 0 && (
        <p role="status" className="rounded-lg bg-white/15 px-3 py-2 text-sm">
          Ontem tem {riskCount} {riskCount === 1 ? "dose" : "doses"} sem registro: resolva até hoje 23:59 para manter a sequência
        </p>
      )}
      <ol className="grid grid-cols-7 gap-1.5" aria-label="Semana">
        {week.map((d) => <Cell key={d.key} day={d} />)}
      </ol>
    </section>
  );
}

