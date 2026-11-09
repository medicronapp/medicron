import { describe, expect, test, vi } from "vitest";
import { Expo, type ExpoPushMessage, type ExpoPushTicket } from "expo-server-sdk";
import { createExpoSender } from "@/lib/push/expo-sender";
import type { PushDeviceRow } from "@/lib/db/schema";

const payload = { title: "Hora do cuidado", body: "Mimi — Amoxicilina", tag: "p-1", url: "/" };
const device = (token: string, platform: "ios" | "android" = "ios"): PushDeviceRow => ({ id: token, userId: "u1", token, platform, createdAt: new Date() });
const real = new Expo();
const fakeExpo = (send: (chunk: ExpoPushMessage[]) => Promise<ExpoPushTicket[]>) =>
  ({ chunkPushNotifications: (m: ExpoPushMessage[]) => real.chunkPushNotifications(m), sendPushNotificationsAsync: send }) as unknown as Expo;
const ok = (n: number): ExpoPushTicket[] => Array.from({ length: n }, (_, i) => ({ status: "ok", id: `t${i}` }));
const tokens = (n: number) => Array.from({ length: n }, (_, i) => `ExponentPushToken[t${i}]`);

describe("expoSender", () => {
  test("monta a mensagem com título, corpo, dados (url e tag), som, prioridade alta e canal", async () => {
    const send = vi.fn(async (chunk: ExpoPushMessage[]) => ok(chunk.length));
    const r = await createExpoSender(fakeExpo(send))([device("ExponentPushToken[a]")], payload);
    expect(r).toEqual({ sent: 1, gone: [] });
    expect(send.mock.calls[0][0][0]).toEqual({
      to: "ExponentPushToken[a]", title: "Hora do cuidado", body: "Mimi — Amoxicilina",
      data: { url: "/", tag: "p-1" }, sound: "default", priority: "high", channelId: "default",
    });
  });

  test("token que não parece token do Expo nunca é enviado e vai para gone (limpeza)", async () => {
    const send = vi.fn(async (chunk: ExpoPushMessage[]) => ok(chunk.length));
    const r = await createExpoSender(fakeExpo(send))([device("lixo"), device("ExponentPushToken[a]")], payload);
    expect(r).toEqual({ sent: 1, gone: ["lixo"] });
    expect(send.mock.calls[0][0]).toHaveLength(1);
  });

  test("divide em blocos de até 100", async () => {
    const send = vi.fn(async (chunk: ExpoPushMessage[]) => ok(chunk.length));
    const r = await createExpoSender(fakeExpo(send))(tokens(250).map((t) => device(t)), payload);
    expect(send).toHaveBeenCalledTimes(3);
    expect(send.mock.calls.map((c) => c[0].length)).toEqual([100, 100, 50]);
    expect(r.sent).toBe(250);
  });

  test("DeviceNotRegistered vai para gone; o resto conta como enviado", async () => {
    const send = async (): Promise<ExpoPushTicket[]> => [
      { status: "ok", id: "1" },
      { status: "error", message: "x", details: { error: "DeviceNotRegistered" } },
    ];
    const r = await createExpoSender(fakeExpo(send))([device("ExponentPushToken[a]"), device("ExponentPushToken[b]")], payload);
    expect(r).toEqual({ sent: 1, gone: ["ExponentPushToken[b]"] });
  });

  test("outro erro de ticket não apaga o aparelho; se nada foi enviado, é falha (lança)", async () => {
    const send = async (): Promise<ExpoPushTicket[]> => [{ status: "error", message: "limite", details: { error: "MessageRateExceeded" } }];
    await expect(createExpoSender(fakeExpo(send))([device("ExponentPushToken[a]")], payload)).rejects.toThrow();
  });

  test("outro erro de ticket com algum envio bem-sucedido: devolve o parcial sem apagar", async () => {
    const send = async (): Promise<ExpoPushTicket[]> => [
      { status: "ok", id: "1" },
      { status: "error", message: "limite", details: { error: "MessageRateExceeded" } },
    ];
    const r = await createExpoSender(fakeExpo(send))([device("ExponentPushToken[a]"), device("ExponentPushToken[b]")], payload);
    expect(r).toEqual({ sent: 1, gone: [] });
  });

  test("erro de rede em um bloco não impede os outros; se nenhum bloco enviou, lança", async () => {
    let n = 0;
    const flaky = async (chunk: ExpoPushMessage[]) => { if (n++ === 0) throw new Error("rede"); return ok(chunk.length); };
    const r = await createExpoSender(fakeExpo(flaky))(tokens(150).map((t) => device(t)), payload);
    expect(r).toEqual({ sent: 50, gone: [] });
    const down = async (): Promise<ExpoPushTicket[]> => { throw new Error("rede"); };
    await expect(createExpoSender(fakeExpo(down))([device("ExponentPushToken[a]")], payload)).rejects.toThrow("rede");
  });

  test("não registra token nem corpo em log", async () => {
    const spies = [vi.spyOn(console, "log"), vi.spyOn(console, "error"), vi.spyOn(console, "warn")].map((s) => s.mockImplementation(() => {}));
    const send = async (): Promise<ExpoPushTicket[]> => [{ status: "error", message: "x", details: { error: "DeviceNotRegistered" } }];
    await createExpoSender(fakeExpo(send))([device("ExponentPushToken[segredo]")], payload);
    const logged = spies.flatMap((s) => s.mock.calls).flat().join(" ");
    expect(logged).not.toContain("segredo");
    expect(logged).not.toContain("Amoxicilina");
    spies.forEach((s) => s.mockRestore());
  });
});
