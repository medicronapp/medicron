import Link from "next/link";
import { CalendarCheck, Cat, CheckCircle2, SkipForward } from "lucide-react";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listAgenda, listRecentLogs, type AgendaEntry } from "@/lib/services/doses";
import { listCats } from "@/lib/services/cats";
import { formatDateTime, formatLongDate, formatTime, relativeLabel } from "@/lib/time";
import { cn } from "@/lib/utils";
import { DoseCard } from "@/components/dose-card";
import { EmptyState } from "@/components/empty-state";
import { EnableNotifications } from "@/components/enable-notifications";
import { PageHeader } from "@/components/page-header";
import { buttonVariants } from "@/components/ui/button";

type Tone = "overdue" | "now" | "upcoming";

function Group({ title, entries, tone, now }: { title: string; entries: AgendaEntry[]; tone: Tone; now: Date }) {
  if (entries.length === 0) return null;
  return (
    <section className="grid gap-3" aria-label={title}>
      <h2 className="flex items-center gap-2">
        {title}
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{entries.length}</span>
      </h2>
      {entries.map((e) => (
        <DoseCard
          key={`${e.plan.id}-${e.dueAt.toISOString()}`}
          planId={e.plan.id} scheduledFor={e.dueAt.toISOString()} catName={e.cat.name}
          itemName={e.item.name} dose={e.plan.dose} kind={e.item.kind} tone={tone}
          timeLabel={tone === "overdue" ? formatDateTime(e.dueAt) : formatTime(e.dueAt)}
          relative={relativeLabel(e.dueAt, now)}
        />
      ))}
    </section>
  );
}

function Tile({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className={cn("rounded-2xl p-3", className)}>
      <p className="text-2xl leading-none font-semibold tabular-nums">{value}</p>
      <p className="mt-1.5 text-xs font-medium">{label}</p>
    </div>
  );
}

export default async function Page() {
  const { orgId } = await getOrgContext();
  const db = getDb();
  const now = new Date();
  const [agenda, logs, cats] = await Promise.all([
    listAgenda(db, orgId, now), listRecentLogs(db, orgId, 6), listCats(db, orgId),
  ]);
  const total = agenda.overdue.length + agenda.dueNow.length + agenda.upcoming.length;

  return (
    <div className="grid gap-6">
      <PageHeader title="Hoje" description={formatLongDate(now)} />
      <EnableNotifications compact />

      {cats.length === 0 ? (
        <EmptyState
          icon={Cat}
          title="Comece cadastrando seu primeiro gato"
          description="Depois é só cadastrar as medicações e montar a rotina de cada um."
          action={<Link href="/gatos/novo" className={cn(buttonVariants({ size: "lg" }))}>Cadastrar gato</Link>}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <Tile label="Atrasadas" value={agenda.overdue.length} className="bg-destructive-soft text-destructive-ink" />
            <Tile label="Agora" value={agenda.dueNow.length} className="bg-warning-soft text-warning-ink" />
            <Tile label="Próximas 24 h" value={agenda.upcoming.length} className="bg-info-soft text-info-ink" />
          </div>
          {total === 0 && (
            <EmptyState
              icon={CalendarCheck}
              title="Tudo em dia"
              description="Nada agendado para as próximas 24 horas. Adicione uma rotina na página de um gato."
              action={<Link href="/gatos" className={cn(buttonVariants({ variant: "outline" }))}>Ver gatos</Link>}
            />
          )}
        </>
      )}

      <Group title="Atrasadas" entries={agenda.overdue} tone="overdue" now={now} />
      <Group title="Agora" entries={agenda.dueNow} tone="now" now={now} />
      <Group title="Próximas 24 horas" entries={agenda.upcoming} tone="upcoming" now={now} />

      {logs.length > 0 && (
        <section className="grid gap-3" aria-label="Últimos registros">
          <h2>Últimos registros</h2>
          <ul className="grid gap-2">
            {logs.map((l) => (
              <li key={l.id} className="flex items-start gap-3 rounded-xl border bg-card p-3">
                <span className={cn(
                  "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
                  l.outcome === "done" ? "bg-success-soft text-success-ink" : "bg-muted text-muted-foreground",
                )}>
                  {l.outcome === "done" ? <CheckCircle2 aria-hidden className="size-4" /> : <SkipForward aria-hidden className="size-4" />}
                </span>
                <div className="min-w-0 text-sm">
                  <p className="truncate font-medium">
                    {l.catName} · {l.itemName}{l.value ? ` (${l.value})` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {l.outcome === "done" ? "Feito" : "Pulado"} por {l.userName} · {formatDateTime(l.doneAt)}
                  </p>
                  {l.note && <p className="mt-0.5 line-clamp-2 text-muted-foreground">“{l.note}”</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
