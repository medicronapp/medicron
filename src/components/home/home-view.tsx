import Link from "next/link";
import { HeartPulse } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { EnableNotifications } from "@/components/enable-notifications";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";
import type { Onboarding } from "@/lib/services/onboarding";
import { dayKey, formatLongDate } from "@/lib/time";
import { cn } from "@/lib/utils";
import { AttentionList } from "./attention-list";
import { DayTimeline } from "./day-timeline";
import { FirstStepsCard } from "./first-steps-card";
import type { SHome } from "./serialize";
import { StreakCard } from "./streak-card";
import { WelcomeSheet } from "./welcome-sheet";

/** Composição da home: avisos → título → primeiros passos → sequência → atenção → linha do dia. */
export function HomeView({ home, hasPatients, onboarding }: { home: SHome; hasPatients: boolean; onboarding: Onboarding }) {
  const now = new Date(home.now);
  const riskCount = home.attention.filter((e) => home.streak.pendingKeys.includes(dayKey(new Date(e.scheduledFor)))).length;
  return (
    <div className="grid gap-6">
      <EnableNotifications compact />
      <PageHeader title="Hoje" description={formatLongDate(now)} />
      {onboarding.showWelcome && <WelcomeSheet />}
      {onboarding.checklist.show && <FirstStepsCard steps={onboarding.checklist.steps} />}
      {!hasPatients ? (
        <EmptyState
          icon={HeartPulse}
          title="Comece cadastrando seu primeiro paciente"
          description="Depois é só cadastrar as medicações e montar a rotina de cada um."
          action={<Link href="/pacientes/novo" className={cn(buttonVariants({ size: "lg" }))}>Cadastrar paciente</Link>}
        />
      ) : (
        <>
          <StreakCard
            streak={home.streak} week={home.week} progress={home.progress}
            closedToday={home.closedToday} riskCount={riskCount}
          />
          <AttentionList entries={home.attention} now={home.now} />
          <DayTimeline
            patients={home.patients} selectedKey={home.selectedKey} todayKey={home.todayKey}
            selectedStatus={home.selectedStatus} now={home.now}
          />
        </>
      )}
    </div>
  );
}
