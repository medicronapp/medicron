import { describe, test, expect, vi } from "vitest";
import { createTestDb } from "@/lib/db/test-db";
import { user, organization, member } from "@/lib/db/schema";
import { createPatient, archivePatient } from "@/lib/services/patients";
import { createItem, archiveItem } from "@/lib/services/items";
import { createPlan, updatePlan, deactivatePlan } from "@/lib/services/plans";
import { resolveSlot } from "@/lib/services/slots";
import type { PushSender } from "@/lib/services/dispatch";
import {
  SAFETY_MS, dispatchIfDue, memoryHintStore, nextWakeAt, setHintStore, upstashHintStore, type HintStore,
} from "@/lib/services/wake-hint";

const d = (s: string) => new Date(s);
const noSend: PushSender = async () => ({ ok: true });

async function setup() {
  const db = await createTestDb();
  await db.insert(user).values({ id: "u1", name: "Ana", email: "a@x.com" });
  await db.insert(organization).values({ id: "o1", name: "A", slug: "a", createdAt: new Date() });
  await db.insert(member).values({ id: "m1", organizationId: "o1", userId: "u1", role: "owner", createdAt: new Date() });
  const patient = await createPatient(db, "o1", { name: "Mimi" });
  const item = await createItem(db, "o1", { name: "Amoxicilina", kind: "medication", defaultDose: "1" });
  const plan = (over: Partial<Parameters<typeof createPlan>[2]> = {}) =>
    createPlan(db, "o1", { patientId: patient.id, itemId: item.id, intervalMinutes: 480, anchorAt: d("2026-11-04T08:00:00Z"), now: d("2026-11-04T07:00:00Z"), ...over });
  return { db, patient, item, plan };
}

describe("nextWakeAt: a próxima dose de qualquer rotina ativa", () => {
  test("sem rotinas: null", async () => {
    const { db } = await setup();
    expect(await nextWakeAt(db, d("2026-11-04T07:00:00Z"))).toBeNull();
  });
  test("é a próxima dose estritamente depois de agora (a grade da âncora)", async () => {
    const { db, plan } = await setup();
    await plan();
    expect(await nextWakeAt(db, d("2026-11-04T07:00:00Z"))).toEqual(d("2026-11-04T08:00:00Z"));
    expect(await nextWakeAt(db, d("2026-11-04T08:00:00Z"))).toEqual(d("2026-11-04T16:00:00Z"));
    expect(await nextWakeAt(db, d("2026-11-04T08:00:30Z"))).toEqual(d("2026-11-04T16:00:00Z"));
  });
  test("com várias rotinas vale a mais próxima", async () => {
    const { db, plan } = await setup();
    await plan();
    await plan({ intervalMinutes: 60, anchorAt: d("2026-11-04T07:30:00Z") });
    expect(await nextWakeAt(db, d("2026-11-04T07:00:00Z"))).toEqual(d("2026-11-04T07:30:00Z"));
  });
  test("rotina que só começa no futuro: o início", async () => {
    const { db, plan } = await setup();
    await plan({ anchorAt: d("2026-11-10T09:00:00Z") });
    expect(await nextWakeAt(db, d("2026-11-04T07:00:00Z"))).toEqual(d("2026-11-10T09:00:00Z"));
  });
  test("rotina já encerrada (data final passada) não conta", async () => {
    const { db, plan } = await setup();
    await plan({ endAt: d("2026-11-04T09:00:00Z") });
    expect(await nextWakeAt(db, d("2026-11-04T10:00:00Z"))).toBeNull();
  });
  test("rotina desativada, paciente arquivado ou item arquivado não contam", async () => {
    const a = await setup();
    const p1 = await a.plan();
    await deactivatePlan(a.db, "o1", p1.id, d("2026-11-04T07:00:00Z"));
    expect(await nextWakeAt(a.db, d("2026-11-04T07:00:00Z"))).toBeNull();
    const b = await setup();
    await b.plan();
    await archivePatient(b.db, "o1", b.patient.id);
    expect(await nextWakeAt(b.db, d("2026-11-04T07:00:00Z"))).toBeNull();
    const c = await setup();
    await c.plan();
    await archiveItem(c.db, "o1", c.item.id);
    expect(await nextWakeAt(c.db, d("2026-11-04T07:00:00Z"))).toBeNull();
  });
});

describe("dispatchIfDue: só abre o banco quando há o que fazer", () => {
  test("1º toque (sem dica) roda de verdade e guarda a próxima dose; os seguintes antes dela não tocam o banco", async () => {
    const { db, plan } = await setup();
    await plan();
    const store = memoryHintStore();
    setHintStore(store);
    const send = vi.fn(noSend);
    const first = await dispatchIfDue(db, d("2026-11-04T07:00:10Z"), send);
    expect(first.skipped).toBe(false);
    const dbSpy = vi.spyOn(db, "select");
    const second = await dispatchIfDue(db, d("2026-11-04T07:01:10Z"), send);
    expect(second).toEqual({ skipped: true, plans: 0, sent: 0, removed: 0 });
    expect(dbSpy).not.toHaveBeenCalled();
  });

  test("na hora da dose roda e dispara; depois já guarda a dose seguinte", async () => {
    const { db, plan } = await setup();
    await plan();
    setHintStore(memoryHintStore());
    const send = vi.fn(noSend);
    await dispatchIfDue(db, d("2026-11-04T07:00:10Z"), send);
    const due = await dispatchIfDue(db, d("2026-11-04T08:00:20Z"), send);
    expect(due.skipped).toBe(false);
    expect(due.plans).toBe(1);
    const after = await dispatchIfDue(db, d("2026-11-04T08:01:20Z"), send);
    expect(after.skipped).toBe(true);
  });

  test("mudar uma rotina invalida a dica: o toque seguinte confere o banco e enxerga a dose nova", async () => {
    const { db, plan } = await setup();
    const existing = await plan();
    setHintStore(memoryHintStore());
    const send = vi.fn(noSend);
    await dispatchIfDue(db, d("2026-11-04T07:00:10Z"), send);
    // a nova rotina vence antes da dica guardada (08:00): sem invalidar, o aviso das 07:30 se perderia
    await plan({ intervalMinutes: 60, anchorAt: d("2026-11-04T07:30:00Z"), now: d("2026-11-04T07:00:20Z") });
    const r = await dispatchIfDue(db, d("2026-11-04T07:30:10Z"), send);
    expect(r.skipped).toBe(false);
    expect(r.plans).toBe(1);
    expect(existing.id).toBeTruthy();
  });

  test.each([
    ["editar a rotina", async (c: Awaited<ReturnType<typeof setup>>, id: string) => { await updatePlan(c.db, "o1", id, { intervalMinutes: 240, now: d("2026-11-04T07:00:20Z") }); }],
    ["desativar a rotina", async (c: Awaited<ReturnType<typeof setup>>, id: string) => { await deactivatePlan(c.db, "o1", id, d("2026-11-04T07:00:20Z")); }],
    ["arquivar o paciente", async (c: Awaited<ReturnType<typeof setup>>) => { await archivePatient(c.db, "o1", c.patient.id); }],
    ["arquivar o item", async (c: Awaited<ReturnType<typeof setup>>) => { await archiveItem(c.db, "o1", c.item.id); }],
  ])("%s também invalida a dica", async (_name, mutate) => {
    const c = await setup();
    const p = await c.plan();
    setHintStore(memoryHintStore());
    await dispatchIfDue(c.db, d("2026-11-04T07:00:10Z"), noSend);
    expect((await dispatchIfDue(c.db, d("2026-11-04T07:00:15Z"), noSend)).skipped).toBe(true);
    await mutate(c, p.id);
    expect((await dispatchIfDue(c.db, d("2026-11-04T07:00:30Z"), noSend)).skipped).toBe(false);
  });

  test("resolver 'feito' numa rotina que reprograma desloca a grade e invalida a dica", async () => {
    const c = await setup();
    const p = await c.plan({ reschedule: true });
    setHintStore(memoryHintStore());
    const now = d("2026-11-04T08:10:00Z");
    await dispatchIfDue(c.db, d("2026-11-04T08:00:10Z"), noSend);
    expect((await dispatchIfDue(c.db, d("2026-11-04T08:01:00Z"), noSend)).skipped).toBe(true);
    await resolveSlot(c.db, "o1", "u1", { planId: p.id, scheduledFor: d("2026-11-04T08:00:00Z"), outcome: "done", appliedAt: now, now });
    expect((await dispatchIfDue(c.db, d("2026-11-04T08:11:00Z"), noSend)).skipped).toBe(false);
  });

  test("corrida: invalidar enquanto o toque calculava impede que a dica velha seja guardada como boa", async () => {
    const { db, plan } = await setup();
    await plan();
    const inner = memoryHintStore();
    let bumpedDuringRun = false;
    const racing: HintStore = {
      ...inner,
      // simula uma mudança de rotina acontecendo entre a leitura da versão e a gravação da dica
      set: async (hint, ttl) => {
        if (!bumpedDuringRun) { bumpedDuringRun = true; await inner.bump(); }
        return inner.set(hint, ttl);
      },
    };
    setHintStore(racing);
    await dispatchIfDue(db, d("2026-11-04T07:00:10Z"), noSend);
    const r = await dispatchIfDue(db, d("2026-11-04T07:00:40Z"), noSend);
    expect(r.skipped).toBe(false);
  });

  test("a dica expira: no máximo SAFETY_MS depois confere o banco de qualquer jeito", async () => {
    const { db, plan } = await setup();
    await plan({ anchorAt: d("2026-11-20T08:00:00Z") });
    setHintStore(memoryHintStore());
    const t0 = d("2026-11-04T07:00:00Z");
    await dispatchIfDue(db, t0, noSend);
    expect((await dispatchIfDue(db, new Date(t0.getTime() + SAFETY_MS - 1000), noSend)).skipped).toBe(true);
    expect((await dispatchIfDue(db, new Date(t0.getTime() + SAFETY_MS + 1000), noSend)).skipped).toBe(false);
  });

  test("sem rotinas nenhuma: também pula (até o limite de segurança)", async () => {
    const { db } = await setup();
    setHintStore(memoryHintStore());
    await dispatchIfDue(db, d("2026-11-04T07:00:00Z"), noSend);
    expect((await dispatchIfDue(db, d("2026-11-04T07:01:00Z"), noSend)).skipped).toBe(true);
  });

  test("falha de envio com tentativa pendente: a dica NÃO pula o próximo toque (o aviso será refeito)", async () => {
    const { db, plan } = await setup();
    await plan();
    setHintStore(memoryHintStore());
    const failing: PushSender = async () => { throw new Error("rede"); };
    // sem nenhum aparelho cadastrado o envio é vazio; cadastra um para falhar de verdade
    const { saveSubscription } = await import("@/lib/services/push");
    await saveSubscription(db, "u1", { endpoint: "https://p/1", keys: { p256dh: "p", auth: "a" } });
    const t = d("2026-11-04T08:00:20Z");
    const r1 = await dispatchIfDue(db, t, failing);
    expect(r1.sent).toBe(0);
    const r2 = await dispatchIfDue(db, d("2026-11-04T08:01:20Z"), noSend);
    expect(r2.skipped).toBe(false);
    expect(r2.sent).toBe(1);
  });

  test("o cache fora do ar não derruba nem atrasa nada: roda sempre no banco", async () => {
    const { db, plan } = await setup();
    await plan();
    const broken: HintStore = {
      read: async () => { throw new Error("redis fora"); },
      set: async () => { throw new Error("redis fora"); },
      bump: async () => { throw new Error("redis fora"); },
    };
    setHintStore(broken);
    const r = await dispatchIfDue(db, d("2026-11-04T08:00:20Z"), noSend);
    expect(r.skipped).toBe(false);
    expect(r.plans).toBe(1);
    // e mudar rotinas também não quebra por causa do cache
    await expect(plan({ intervalMinutes: 60, anchorAt: d("2026-11-04T09:00:00Z") })).resolves.toBeTruthy();
  });

  test("sem o Redis configurado (sem variáveis de ambiente): comportamento antigo, sempre roda", async () => {
    const { db, plan } = await setup();
    await plan();
    setHintStore(null);
    await dispatchIfDue(db, d("2026-11-04T07:00:10Z"), noSend);
    expect((await dispatchIfDue(db, d("2026-11-04T07:00:40Z"), noSend)).skipped).toBe(false);
  });
});

describe("upstashHintStore (API REST)", () => {
  const env = { UPSTASH_REDIS_REST_URL: "https://redis.test", UPSTASH_REDIS_REST_TOKEN: "tok" };
  test("sem as variáveis não existe (null)", () => {
    expect(upstashHintStore({})).toBeNull();
    expect(upstashHintStore({ UPSTASH_REDIS_REST_URL: "https://x" })).toBeNull();
  });
  test("aceita os nomes KV_REST_API_* que a Vercel cria na integração", () => {
    expect(upstashHintStore({ KV_REST_API_URL: "https://x", KV_REST_API_TOKEN: "t" })).not.toBeNull();
  });
  test("read: MGET da dica e da versão, com o token no cabeçalho", async () => {
    const f = vi.fn(async () => Response.json({ result: [JSON.stringify({ nextWake: 10, checkedAt: 5, version: 3 }), "3"] }));
    const store = upstashHintStore(env, f as unknown as typeof fetch)!;
    expect(await store.read()).toEqual({ hint: { nextWake: 10, checkedAt: 5, version: 3 }, version: 3 });
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://redis.test");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer tok");
    expect(JSON.parse(init.body as string)).toEqual(["MGET", "medicron:wake:hint", "medicron:wake:version"]);
  });
  test("read: sem nada guardado (null/null) vira versão 0 e sem dica", async () => {
    const f = vi.fn(async () => Response.json({ result: [null, null] }));
    expect(await upstashHintStore(env, f as unknown as typeof fetch)!.read()).toEqual({ hint: null, version: 0 });
  });
  test("set: SET com expiração; bump: INCR da versão", async () => {
    const f = vi.fn(async () => Response.json({ result: "OK" }));
    const store = upstashHintStore(env, f as unknown as typeof fetch)!;
    await store.set({ nextWake: 10, checkedAt: 5, version: 3 }, 1800);
    expect(JSON.parse((f.mock.calls[0] as unknown as [string, RequestInit])[1].body as string)).toEqual(["SET", "medicron:wake:hint", JSON.stringify({ nextWake: 10, checkedAt: 5, version: 3 }), "EX", "1800"]);
    await store.bump();
    expect(JSON.parse((f.mock.calls[1] as unknown as [string, RequestInit])[1].body as string)).toEqual(["INCR", "medicron:wake:version"]);
  });
  test("resposta de erro do Redis vira exceção (quem chama trata como cache fora do ar)", async () => {
    const f = vi.fn(async () => new Response("no", { status: 500 }));
    await expect(upstashHintStore(env, f as unknown as typeof fetch)!.read()).rejects.toThrow();
  });
});
