// Dica de "quando é a próxima dose", guardada num Redis (Upstash, API REST) para o agendador de minuto em minuto NÃO acordar o
// banco quando não há nada a disparar. A dica só pode **adiar** uma ida ao banco; qualquer dúvida (sem Redis, Redis fora do ar,
// versão trocada, dica velha) significa "vá ao banco". Este arquivo não importa o banco (evita ciclo com os serviços que invalidam).
export type WakeHint = { nextWake: number; checkedAt: number; version: number };
export type HintRead = { hint: WakeHint | null; version: number };
export type HintStore = {
  read(): Promise<HintRead>;
  set(hint: WakeHint, ttlSeconds: number): Promise<void>;
  /** Troca a versão: toda dica gravada com a versão anterior deixa de valer. */
  bump(): Promise<void>;
};

/** Teto de segurança: mesmo com a dica válida, o banco é conferido pelo menos a cada 30 min. */
export const SAFETY_MS = 30 * 60_000;

const HINT_KEY = "medicron:wake:hint";
const VERSION_KEY = "medicron:wake:version";

type Env = Record<string, string | undefined>;

export function upstashHintStore(env: Env = process.env, fetchImpl: typeof fetch = fetch): HintStore | null {
  const url = (env.UPSTASH_REDIS_REST_URL ?? env.KV_REST_API_URL)?.trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN ?? env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) return null;
  async function call(command: string[]): Promise<unknown> {
    const res = await fetchImpl(url!, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify(command),
      signal: AbortSignal.timeout(2000), // o cache nunca pode segurar o agendador
    });
    if (!res.ok) throw new Error(`Redis respondeu ${res.status}`);
    return ((await res.json()) as { result: unknown }).result;
  }
  return {
    async read() {
      const [hint, version] = (await call(["MGET", HINT_KEY, VERSION_KEY])) as [string | null, string | null];
      return { hint: hint ? (JSON.parse(hint) as WakeHint) : null, version: Number(version ?? 0) };
    },
    async set(hint, ttlSeconds) {
      await call(["SET", HINT_KEY, JSON.stringify(hint), "EX", String(ttlSeconds)]);
    },
    async bump() {
      await call(["INCR", VERSION_KEY]);
    },
  };
}

/** Para os testes (e para rodar sem Redis): guarda na memória do processo. */
export function memoryHintStore(): HintStore {
  let hint: WakeHint | null = null;
  let version = 0;
  return {
    read: async () => ({ hint, version }),
    set: async (h) => { hint = h; },
    bump: async () => { version += 1; },
  };
}

let current: HintStore | null | undefined; // undefined = ainda não decidiu (lê do ambiente)
export function setHintStore(store: HintStore | null): void { current = store; }
export const getHintStore = (): HintStore | null => (current === undefined ? (current = upstashHintStore()) : current);

/** Chamado depois de qualquer mudança que possa adiantar a próxima dose. Nunca lança: se falhar, vale o teto de segurança. */
export async function invalidateWakeHint(): Promise<void> {
  try {
    await getHintStore()?.bump();
  } catch (err) {
    console.error("cache de próxima dose: falha ao invalidar", err instanceof Error ? err.message : err);
  }
}
