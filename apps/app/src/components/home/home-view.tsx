import { View } from "react-native";
import { HeartPulse } from "lucide-react-native";
import type { HomeDto, OnboardingDto } from "@medicron/shared";
import { dayKey, formatLongDate } from "@medicron/shared";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { AttentionList } from "./attention-list";
import { DayTimeline } from "./day-timeline";
import { FirstStepsCard } from "./first-steps-card";
import { StreakCard } from "./streak-card";
import { WelcomeSheet } from "./welcome-sheet";

type Props = {
  home: HomeDto; hasPatients: boolean; onboarding: OnboardingDto;
  onSelectDay: (key: string, isToday: boolean) => void; onBackToToday: () => void; onNavigate: (href: string) => void;
};

/** Composição da Hoje: título → boas-vindas → primeiros passos → sequência → atenção → linha do dia. */
export function HomeView({ home, hasPatients, onboarding, onSelectDay, onBackToToday, onNavigate }: Props) {
  const riskCount = home.attention.filter((e) => home.streak.pendingKeys.includes(dayKey(new Date(e.scheduledFor)))).length;
  return (
    <View className="gap-6">
      <PageHeader title="Hoje" description={formatLongDate(new Date(home.now))} />
      {onboarding.showWelcome ? <WelcomeSheet /> : null}
      {onboarding.checklist.show ? <FirstStepsCard steps={onboarding.checklist.steps} onNavigate={onNavigate} /> : null}
      {!hasPatients ? (
        <EmptyState
          icon={HeartPulse}
          title="Comece cadastrando seu primeiro paciente"
          description="Depois é só cadastrar as medicações e montar a rotina de cada um."
          action={<Button size="lg" onPress={() => onNavigate("/pacientes/novo")}>Cadastrar paciente</Button>}
        />
      ) : (
        <>
          <StreakCard
            streak={home.streak} week={home.week} progress={home.progress} closedToday={home.closedToday}
            riskCount={riskCount} onSelectDay={onSelectDay}
          />
          <AttentionList entries={home.attention} now={home.now} />
          <DayTimeline
            patients={home.patients} selectedKey={home.selectedKey} todayKey={home.todayKey}
            selectedStatus={home.selectedStatus} onBackToToday={onBackToToday}
          />
        </>
      )}
    </View>
  );
}
