import Link from "next/link";
import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listAgenda, listRecentLogs, type AgendaEntry } from "@/lib/services/doses";
import { listCats } from "@/lib/services/cats";
import { formatDateTime, formatTime } from "@/lib/time";
import { EnableNotifications } from "@/components/enable-notifications";
import { DoseCard } from "@/components/dose-card";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function Group({ title, entries, tone, now }: {
  title: string; entries: AgendaEntry[]; tone: "overdue" | "now" | "upcoming"; now: Date;
}) {
  if (entries.length === 0) return null;
  return (
    <section className="grid gap-3">
      <h2 className="font-semibold">{title}</h2>
      {entries.map((e) => (
        <DoseCard
          key={`${e.plan.id}-${e.dueAt.toISOString()}`}
          planId={e.plan.id} scheduledFor={e.dueAt.toISOString()} catName={e.cat.name}
          itemName={e.item.name} dose={e.plan.dose} kind={e.item.kind} tone={tone}
          timeLabel={tone === "overdue" ? `Atrasada · ${formatDateTime(e.dueAt)}` : formatTime(e.dueAt)}
        />
      ))}
    </section>
  );
}

export default async function Page() {
  const { orgId } = await getOrgContext();
  const db = getDb();
  const now = new Date();
  const [agenda, logs, cats] = await Promise.all([
    listAgenda(db, orgId, now), listRecentLogs(db, orgId, 5), listCats(db, orgId),
  ]);
  const empty = agenda.overdue.length + agenda.dueNow.length + agenda.upcoming.length === 0;

  return (
    <div className="grid gap-6">
      <h1 className="text-xl font-semibold">Hoje</h1>
      <EnableNotifications compact />
      {cats.length === 0 && (
        <div className="grid gap-3 rounded-xl border p-4 text-center">
          <p>Comece cadastrando seu primeiro gato.</p>
          <Link href="/gatos/novo" className={cn(buttonVariants(), "h-11")}>Cadastrar gato</Link>
        </div>
      )}
      {cats.length > 0 && empty && (
        <p className="text-muted-foreground">Nada agendado para as próximas 24 horas. Adicione uma rotina na página de um gato.</p>
      )}
      <Group title="Atrasadas" entries={agenda.overdue} tone="overdue" now={now} />
      <Group title="Agora" entries={agenda.dueNow} tone="now" now={now} />
      <Group title="Próximas 24 horas" entries={agenda.upcoming} tone="upcoming" now={now} />
      {logs.length > 0 && (
        <section className="grid gap-2">
          <h2 className="font-semibold">Últimos registros</h2>
          <ul className="divide-y text-sm">
            {logs.map((l) => (
              <li key={l.id} className="py-2">
                <span className="font-medium">{l.catName}</span> · {l.itemName}
                {l.value ? ` (${l.value})` : ""} — {l.outcome === "done" ? "feito" : "pulado"} por {l.userName} às {formatDateTime(l.doneAt)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
