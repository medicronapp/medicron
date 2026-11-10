// Dados de demonstração para as capturas de tela do hotsite: o app web REAL roda contra uma API simulada com estes dados,
// com o relógio congelado, então as imagens são do próprio app (não um desenho) e saem iguais em qualquer dia.
import type { EntryDto, HomeDto, ItemDto, MeDto, PatientDto, PlanDto } from "@medicron/shared"; // só tipos: o Node não importa o fonte do shared em tempo de execução
import type { HomeResponse } from "../src/lib/api/home";
import type { WidgetProps } from "../src/lib/widget-data";

/** Terça-feira, 10/11/2026, 12:05 em Brasília (UTC-3). */
export const DEMO_NOW = new Date("2026-11-10T15:05:00.000Z");
const TODAY = "2026-11-10";
const ORG_ID = "org_demo";
const USER_ID = "user_demo";
/** Soma dias a uma chave "AAAA-MM-DD" (meio-dia UTC evita virada por fuso). Igual ao `addDays` do shared; o teste confere. */
const addDays = (key: string, n: number) => new Date(new Date(`${key}T12:00:00Z`).getTime() + n * 86_400_000).toISOString().slice(0, 10);
const at = (hhmm: string) => new Date(`${TODAY}T${hhmm}:00-03:00`).toISOString();

const entry = (over: Partial<EntryDto> & Pick<EntryDto, "planId" | "patientId" | "patientName" | "itemName" | "dose" | "state"> & { time: string }): EntryDto => {
  const { time, ...rest } = over;
  const scheduledFor = at(time);
  const done = rest.state === "done";
  return {
    kind: "medication", reschedule: false, resolvedBy: done ? "Ana Souza" : null,
    resolvedAt: done ? new Date(new Date(scheduledFor).getTime() + 2 * 60_000).toISOString() : null,
    late: false, value: null, note: null, scheduledFor, ...rest,
  };
};

const omeprazol = entry({ planId: "pl1", patientId: "pa_ana", patientName: "Ana", itemName: "Omeprazol", dose: "20 mg", state: "done", time: "06:30" });
const vermifugo = entry({ planId: "pl2", patientId: "pa_mel", patientName: "Mel", itemName: "Vermífugo", dose: "1 comprimido", state: "done", time: "07:00" });
const antialergico = entry({ planId: "pl3", patientId: "pa_mel", patientName: "Mel", itemName: "Antialérgico", dose: "½ comprimido", state: "done", time: "07:30" });
const vitaminaD = entry({ planId: "pl4", patientId: "pa_pedro", patientName: "Pedro", itemName: "Vitamina D", dose: "5 gotas", state: "missed", time: "08:00" });
const losartana = entry({ planId: "pl5", patientId: "pa_ana", patientName: "Ana", itemName: "Losartana", dose: "50 mg", state: "now", time: "12:00" });

const group = (patientId: string, patientName: string, entries: EntryDto[]) => ({
  patientId, patientName, entries, total: entries.length,
  resolved: entries.filter((e) => e.state === "done").length, missed: entries.filter((e) => e.state === "missed").length,
});

export function demoHome(): HomeResponse {
  const week = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(TODAY, i - 6);
    return { key, isToday: key === TODAY, status: (key === TODAY ? "open" : "ok") as HomeDto["week"][number]["status"] };
  });
  const home: HomeDto = {
    now: DEMO_NOW.toISOString(), todayKey: TODAY, selectedKey: TODAY, selectedStatus: "open",
    streak: { days: 6, atRisk: false, pendingKeys: [] }, week,
    progress: { resolved: 3, total: 5 }, closedToday: false,
    attention: [vitaminaD, losartana],
    patients: [group("pa_pedro", "Pedro", [vitaminaD]), group("pa_ana", "Ana", [omeprazol, losartana]), group("pa_mel", "Mel", [vermifugo, antialergico])],
  };
  return {
    home, hasPatients: true,
    onboarding: { showWelcome: false, checklist: { show: false, steps: { patient: true, item: true, plan: true, push: true } } },
  };
}

export const demoMe = (): MeDto => ({ user: { id: USER_ID, name: "Ana Souza", email: "ana@example.com" }, orgId: ORG_ID, role: "owner" });

export const demoOrgs = () => [{ id: ORG_ID, name: "Família Souza", slug: "familia-souza", logo: null, metadata: null, createdAt: "2026-01-02T12:00:00.000Z" }];

/** Resposta de `organization/get-full-organization`: a conta com as pessoas (tela Conta). */
export function demoFullOrg() {
  const base = demoOrgs()[0];
  const member = (id: string, userId: string, name: string, email: string, role: "owner" | "admin" | "member") => ({
    id, organizationId: base.id, userId, role, createdAt: "2026-01-02T12:00:00.000Z",
    user: { id: userId, name, email, image: null },
  });
  return {
    ...base,
    members: [
      member("mem_ana", USER_ID, "Ana Souza", "ana@example.com", "owner"),
      member("mem_pedro", "user_pedro", "Pedro Souza", "pedro@example.com", "admin"),
      member("mem_carla", "user_carla", "Carla Souza", "carla@example.com", "member"),
    ],
    invitations: [] as { id: string; email: string; status: string }[],
  };
}

export function demoSession() {
  return {
    session: {
      id: "sess_demo", token: "demo", userId: USER_ID, activeOrganizationId: ORG_ID, ipAddress: null, userAgent: null,
      createdAt: "2026-11-09T12:00:00.000Z", updatedAt: "2026-11-10T14:00:00.000Z", expiresAt: "2026-11-17T12:00:00.000Z",
    },
    user: { id: USER_ID, name: "Ana Souza", email: "ana@example.com", emailVerified: true, image: null, createdAt: "2026-01-02T12:00:00.000Z", updatedAt: "2026-01-02T12:00:00.000Z" },
  };
}

/**
 * Script injetado no <head> do app: congela o relógio em DEMO_NOW (ele continua andando a partir daí) e grava o tema
 * escolhido, para a captura sair idêntica em qualquer dia e no tema pedido.
 */
export function freezeTimeScript(theme: "light" | "dark" | string): string {
  return `(function(){
  var Real=Date,start=Real.now(),base=${DEMO_NOW.getTime()};
  function now(){return base+(Real.now()-start)}
  function Fake(a,b,c,d,e,f,g){
    if(!(this instanceof Fake)) return new Real(now()).toString();
    switch(arguments.length){case 0:return new Real(now());case 1:return new Real(a);case 2:return new Real(a,b);case 3:return new Real(a,b,c);
      case 4:return new Real(a,b,c,d);case 5:return new Real(a,b,c,d,e);case 6:return new Real(a,b,c,d,e,f);default:return new Real(a,b,c,d,e,f,g)}
  }
  Fake.prototype=Real.prototype;Fake.now=now;Fake.parse=Real.parse;Fake.UTC=Real.UTC;
  window.Date=Fake;
  try{localStorage.setItem("medicron.theme",${JSON.stringify(theme)})}catch(e){}
})();`;
}

// ---- Telas Pacientes, Rotina e Itens (capturas da App Store) ----
const CREATED = "2026-01-02T12:00:00.000Z";

export const demoPatients = (): PatientDto[] => [
  { id: "pa_ana", name: "Ana", species: "human", birthDate: "1968-03-14", weightKg: "68", notes: null, createdAt: CREATED },
  { id: "pa_pedro", name: "Pedro", species: "human", birthDate: "2019-05-02", weightKg: "21", notes: null, createdAt: CREATED },
  { id: "pa_mel", name: "Mel", species: "dog", birthDate: "2021-08-20", weightKg: "12.5", notes: null, createdAt: CREATED },
  { id: "pa_carla", name: "Carla", species: "human", birthDate: "1995-11-30", weightKg: "61", notes: null, createdAt: CREATED },
  { id: "pa_luna", name: "Luna", species: "cat", birthDate: "2022-02-10", weightKg: "4.2", notes: null, createdAt: CREATED },
];

const item = (id: string, name: string, kind: ItemDto["kind"], defaultDose: string | null): ItemDto => ({ id, name, kind, defaultDose, notes: null, createdAt: CREATED });
export const demoItems = (): ItemDto[] => [
  item("it_losartana", "Losartana", "medication", "50 mg"),
  item("it_omeprazol", "Omeprazol", "medication", "20 mg"),
  item("it_vitd", "Vitamina D", "medication", "5 gotas"),
  item("it_vermifugo", "Vermífugo", "medication", "1 comprimido"),
  item("it_antialergico", "Antialérgico", "medication", "½ comprimido"),
  item("it_calcio", "Cálcio", "medication", "500 mg"),
  item("it_pressao", "Aferir pressão", "procedure", null),
  item("it_fisio", "Fisioterapia", "procedure", null),
  item("it_banho", "Banho medicado", "procedure", null),
];

/** Rotinas de demonstração (só a da Ana é usada nas capturas; as outras existem para o app não quebrar). */
export function demoPlans(patientId: string): PlanDto[] {
  const items = demoItems();
  const plan = (id: string, itemId: string, dose: string | null, intervalMinutes: number, time: string, next: string): PlanDto => ({
    id, patientId, itemId, item: items.find((i) => i.id === itemId), dose, intervalMinutes, anchorAt: at(time), endAt: null,
    active: true, reschedule: false, nextDueAt: next, createdAt: CREATED,
  });
  const tomorrow = (hhmm: string) => new Date(new Date(at(hhmm)).getTime() + 86_400_000).toISOString();
  switch (patientId) {
    case "pa_ana":
      return [
        plan("pl5", "it_losartana", "50 mg", 720, "00:00", at("12:00")),
        plan("pl1", "it_omeprazol", "20 mg", 1440, "06:30", tomorrow("06:30")),
        plan("pl6", "it_pressao", null, 1440, "19:00", at("19:00")),
        plan("pl7", "it_calcio", "500 mg", 720, "08:00", at("20:00")),
        plan("pl8", "it_fisio", null, 2880, "17:30", tomorrow("17:30")),
      ];
    case "pa_pedro":
      return [plan("pl4", "it_vitd", "5 gotas", 1440, "08:00", tomorrow("08:00"))];
    case "pa_mel":
      return [plan("pl2", "it_vermifugo", "1 comprimido", 43_200, "07:00", new Date(new Date(at("07:00")).getTime() + 30 * 86_400_000).toISOString())];
    default:
      return [];
  }
}

// ---- Widgets (slides de tela de bloqueio e tela inicial da App Store) ----

/** Terça, 10/11/2026, 11:40 em Brasília: a Losartana das 12:00 ainda está por vir e a Vitamina D das 08:00 está pendente. */
export const WIDGET_DEMO_NOW = new Date("2026-11-10T14:40:00.000Z");

/** A tela Hoje nesse momento, com mais uma dose da Ana à noite (Cálcio, 20:00: a mesma da tela Rotina). */
export function demoWidgetHome(): HomeDto {
  const base = demoHome().home;
  const calcio = entry({ planId: "pl7", patientId: "pa_ana", patientName: "Ana", itemName: "Cálcio", dose: "500 mg", state: "later", time: "20:00" });
  const losartanaLater: EntryDto = { ...losartana, state: "later" };
  return {
    ...base,
    now: WIDGET_DEMO_NOW.toISOString(),
    progress: { resolved: 3, total: 6 },
    attention: [vitaminaD],
    patients: [group("pa_pedro", "Pedro", [vitaminaD]), group("pa_ana", "Ana", [omeprazol, losartanaLater, calcio]), group("pa_mel", "Mel", [vermifugo, antialergico])],
  };
}

/** O que o app entregaria ao widget nesse momento (o teste confere com `buildWidgetTimeline`, que é o código real). */
export const DEMO_WIDGET_PROPS: WidgetProps = {
  status: "ok", resolved: 3, total: 6,
  upcoming: [
    { time: "12:00", item: "Losartana", patient: "Ana", at: new Date(at("12:00")).getTime() },
    { time: "20:00", item: "Cálcio", patient: "Ana", at: new Date(at("20:00")).getTime() },
  ],
  pendingCount: 1, pendingSince: "08:00",
};
