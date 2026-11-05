import Link from "next/link";
import { Cat } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EnableNotifications } from "@/components/enable-notifications";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import { dayKey, formatLongDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AttentionList } from "./attention-list";
import { DayTimeline } from "./day-timeline";
import type { SHome } from "./serialize";
import { StreakCard } from "./streak-card";

/** Composição da home: sequência → atenção → linha do dia. */
export function HomeView({ home, hasCats }: { home: SHome; hasCats: boolean }) {
  const now = new Date(home.now);
  const riskCount = home.attention.filter((e) => home.streak.pendingKeys.includes(dayKey(new Date(e.scheduledFor)))).length;
  return (
    <div className="grid gap-6">
      <PageHeader title="Hoje" description={formatLongDate(now)} />
      <EnableNotifications compact />
      {!hasCats ? (
        <EmptyState
          icon={Cat}
          title="Comece cadastrando seu primeiro gato"
          description="Depois é só cadastrar as medicações e montar a rotina de cada um."
          action={<Link href="/gatos/novo" className={cn(buttonVariants({ size: "lg" }))}>Cadastrar gato</Link>}
        />
      ) : (
        <>
          <StreakCard
            streak={home.streak} week={home.week} progress={home.progress}
            closedToday={home.closedToday} riskCount={riskCount}
          />
          <AttentionList entries={home.attention} now={home.now} />
          <DayTimeline
            cats={home.cats} selectedKey={home.selectedKey} todayKey={home.todayKey}
            selectedStatus={home.selectedStatus} now={home.now}
          />
        </>
      )}
    </div>
  );
}
