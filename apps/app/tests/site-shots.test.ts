import { addDays, dayKey, type EntryDto, type HomeDto } from "@medicron/shared";
import { DEMO_NOW, demoFullOrg, demoItems, demoPatients, demoPlans, demoMe, demoHome, demoOrgs, demoSession, freezeTimeScript } from "../scripts/demo-data";

describe("dados de demonstração das capturas do hotsite", () => {
  const home = demoHome().home;
  const all = home.patients.flatMap((p) => p.entries);

  test("instante fixo: terça, 10/11/2026, 12:05 em Brasília (as capturas não dependem do relógio de quem as gera)", () => {
    expect(DEMO_NOW.toISOString()).toBe("2026-11-10T15:05:00.000Z");
    expect(home.now).toBe(DEMO_NOW.toISOString());
    expect(home.todayKey).toBe("2026-11-10");
    expect(dayKey(DEMO_NOW)).toBe("2026-11-10");
  });

  test("'3 de 5 doses feitas': o progresso bate com as doses", () => {
    expect(home.progress).toEqual({ resolved: 3, total: 5 });
    expect(all).toHaveLength(5);
    expect(all.filter((e) => e.state === "done")).toHaveLength(3);
  });

  test("estados coerentes com o horário (feitas antes, uma atrasada, uma agora)", () => {
    const by = (state: EntryDto["state"]) => all.filter((e) => e.state === state);
    expect(by("missed")).toHaveLength(1);
    expect(by("now")).toHaveLength(1);
    expect(new Date(by("missed")[0].scheduledFor).getTime()).toBeLessThan(DEMO_NOW.getTime() - 15 * 60_000);
    expect(Math.abs(new Date(by("now")[0].scheduledFor).getTime() - DEMO_NOW.getTime())).toBeLessThanOrEqual(15 * 60_000);
    for (const e of by("done")) {
      expect(new Date(e.scheduledFor).getTime()).toBeLessThan(DEMO_NOW.getTime());
      expect(e.resolvedAt).not.toBeNull();
    }
  });

  test("a atenção lista as pendentes (atrasada e agora) e cada grupo de paciente soma certo", () => {
    expect(home.attention.map((e) => e.state).sort()).toEqual(["missed", "now"]);
    for (const g of home.patients) {
      expect(g.total).toBe(g.entries.length);
      expect(g.resolved).toBe(g.entries.filter((e) => e.state === "done").length);
      expect(g.missed).toBe(g.entries.filter((e) => e.state === "missed").length);
    }
  });

  test("nomes do exemplo: Família Souza, Pedro, Ana e Mel (e nenhuma Vovó)", () => {
    expect(demoOrgs()[0].name).toBe("Família Souza");
    expect(home.patients.map((p) => p.patientName).sort()).toEqual(["Ana", "Mel", "Pedro"]);
    expect(JSON.stringify([demoHome(), demoMe(), demoOrgs()])).not.toMatch(/Vov[óo]/);
  });

  test("a semana termina hoje, com os mesmos dias que o addDays do app calcularia", () => {
    expect(home.week.map((d) => d.key)).toEqual(Array.from({ length: 7 }, (_, i) => addDays("2026-11-10", i - 6)));
  });
  test("a sequência é plausível", () => {
    expect(home.week).toHaveLength(7);
    expect(home.week[home.week.length - 1]).toMatchObject({ key: "2026-11-10", isToday: true });
    expect(home.week[0].key).toBe(addDays("2026-11-10", -6));
    expect(home.streak.days).toBeGreaterThan(0);
  });

  test("tela já passou das boas-vindas e do passo a passo (nada de cartão de primeiros passos na captura)", () => {
    const r = demoHome();
    expect(r.hasPatients).toBe(true);
    expect(r.onboarding.showWelcome).toBe(false);
    expect(r.onboarding.checklist.show).toBe(false);
  });

  test("a conta de demonstração é Plus (tem 5 pacientes, acima do limite do grátis): o /me traz a assinatura", () => {
    const sub = demoMe().subscription;
    expect(sub.tier).toBe("plus");
    expect(new Date(sub.plusUntil!).getTime()).toBeGreaterThan(DEMO_NOW.getTime());
    expect(sub.limits.patients).toBeNull();
    expect(sub.usage.patients).toBe(demoPatients().length);
    expect(sub.usage.members).toBe(demoFullOrg().members.length);
  });

  test("sessão, usuário e conta batem entre si", () => {
    const s = demoSession();
    expect(s.session.activeOrganizationId).toBe(demoOrgs()[0].id);
    expect(demoMe().orgId).toBe(demoOrgs()[0].id);
    expect(demoMe().user.id).toBe(s.user.id);
    expect(new Date(s.session.expiresAt).getTime()).toBeGreaterThan(DEMO_NOW.getTime());
  });
});

describe("conta completa para a captura da tela Conta (cartão 'Em família')", () => {
  const org = demoFullOrg();
  test("é a mesma conta da sessão, com a pessoa da sessão como dona", () => {
    expect(org.id).toBe(demoOrgs()[0].id);
    expect(org.name).toBe("Família Souza");
    const owner = org.members.find((m) => m.role === "owner")!;
    expect(owner.userId).toBe(demoMe().user.id);
    expect(owner.user.name).toBe("Ana Souza");
  });
  test("tem 3 pessoas com nomes diferentes e e-mails de exemplo", () => {
    expect(org.members).toHaveLength(3);
    expect(new Set(org.members.map((m) => m.user.name)).size).toBe(3);
    for (const m of org.members) expect(m.user.email).toMatch(/@example\.com$/);
  });
  test("sem convites pendentes (a captura mostra só pessoas e o convite por link)", () => {
    expect(org.invitations).toEqual([]);
  });
});

describe("dados das telas Pacientes, Rotina e Itens (capturas da loja)", () => {
  const home = demoHome().home;
  const patients = demoPatients();
  const items = demoItems();
  test("os pacientes do Hoje estão na lista (mesmos ids e nomes), a lista tem 5 e a espécie é válida; sem Vovó", () => {
    expect(patients).toHaveLength(5);
    for (const g of home.patients) expect(patients.find((p) => p.id === g.patientId)?.name).toBe(g.patientName);
    expect(new Set(patients.map((p) => p.id)).size).toBe(5);
    for (const p of patients) expect(["human", "dog", "cat"]).toContain(p.species);
    expect(JSON.stringify([patients, items])).not.toMatch(/Vov[óo]/);
  });
  test("as medicações do Hoje existem em Itens, com a mesma dose", () => {
    for (const e of home.patients.flatMap((p) => p.entries)) {
      const it = items.find((i) => i.name === e.itemName);
      expect(it).toBeDefined();
      expect(it!.defaultDose).toBe(e.dose);
    }
  });
  test("há medicações e procedimentos (os dois filtros da tela Itens têm conteúdo)", () => {
    expect(items.some((i) => i.kind === "medication")).toBe(true);
    expect(items.some((i) => i.kind === "procedure")).toBe(true);
  });
  test("a rotina da Ana tem 5 itens, todos de Itens, com horário próximo e dose igual à do Hoje", () => {
    const plans = demoPlans("pa_ana");
    expect(plans).toHaveLength(5);
    for (const pl of plans) {
      expect(pl.patientId).toBe("pa_ana");
      expect(items.map((i) => i.id)).toContain(pl.itemId);
      expect(pl.item?.id).toBe(pl.itemId);
      expect(pl.active).toBe(true);
      expect(new Date(pl.nextDueAt).getTime()).toBeGreaterThan(DEMO_NOW.getTime() - 24 * 3_600_000);
    }
    expect(plans.find((p) => p.item?.name === "Losartana")?.dose).toBe("50 mg");
  });
  test("pacientes sem rotina de demonstração devolvem lista vazia (não quebra)", () => {
    expect(demoPlans("pa_inexistente")).toEqual([]);
  });
});

describe("script que congela o relógio e o tema no navegador", () => {
  const run = (theme: string) => {
    const store: Record<string, string> = {};
    const win: Record<string, unknown> = {};
    new Function("window", "localStorage", freezeTimeScript(theme))(win, { setItem: (k: string, v: string) => { store[k] = v; } });
    return { Date: win.Date as DateConstructor, store };
  };
  test("new Date() e Date.now() partem do instante da demonstração e andam", () => {
    const { Date: D } = run("light");
    const first = new D().getTime();
    expect(Math.abs(first - DEMO_NOW.getTime())).toBeLessThan(2000);
    expect(Math.abs(D.now() - DEMO_NOW.getTime())).toBeLessThan(2000);
  });
  test("datas com argumento continuam funcionando normalmente", () => {
    const { Date: D } = run("light");
    expect(new D("2026-01-02T03:04:05Z").toISOString()).toBe("2026-01-02T03:04:05.000Z");
    expect(new D(2026, 0, 2).getFullYear()).toBe(2026);
    expect(D.UTC(2026, 0, 1)).toBe(Date.UTC(2026, 0, 1));
  });
  test("grava o tema escolhido (mesma chave do app)", () => {
    expect(run("dark").store["medicron.theme"]).toBe("dark");
    expect(run("light").store["medicron.theme"]).toBe("light");
  });
});

describe("API simulada (demoApi)", () => {
  const { demoApi } = require("../scripts/demo-server") as typeof import("../scripts/demo-server");
  test("responde pacientes, paciente, rotinas e itens (com filtro por tipo)", () => {
    expect((demoApi("/api/v1/patients") as { patients: unknown[] }).patients).toHaveLength(5);
    expect((demoApi("/api/v1/patients/pa_ana") as { patient: { name: string } }).patient.name).toBe("Ana");
    expect((demoApi("/api/v1/patients/pa_ana/plans") as { plans: unknown[] }).plans).toHaveLength(5);
    const all = (demoApi("/api/v1/items") as { items: unknown[] }).items.length;
    const procs = (demoApi("/api/v1/items", "?kind=procedure") as { items: { kind: string }[] }).items;
    expect(procs.length).toBeGreaterThan(0);
    expect(procs.length).toBeLessThan(all);
    expect(procs.every((i) => i.kind === "procedure")).toBe(true);
  });
  test("rota desconhecida e paciente inexistente: undefined (o servidor responde 404)", () => {
    expect(demoApi("/api/v1/nada")).toBeUndefined();
    expect(demoApi("/api/v1/patients/pa_x")).toBeUndefined();
  });
});
