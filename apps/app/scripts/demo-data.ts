// Dados de demonstração para as capturas de tela do hotsite: o app web REAL roda contra uma API simulada com estes dados,
// com o relógio congelado, então as imagens são do próprio app (não um desenho) e saem iguais em qualquer dia.
import type { EntryDto, HomeDto, MeDto } from "@medicron/shared"; // só tipos: o Node não importa o fonte do shared em tempo de execução
import type { HomeResponse } from "../src/lib/api/home";

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
