import { Expo, type ExpoPushMessage } from "expo-server-sdk";
import type { DeviceSender } from "@/lib/services/dispatch";

/**
 * Envio pelo Expo Push Service (APNs e FCM). Valida o token antes de enviar, divide em blocos de até 100 e lê os
 * tickets: `DeviceNotRegistered` volta em `gone` (o token será apagado); qualquer outro erro não apaga nada e conta como
 * falha — só lança quando **nada** foi enviado (aí o horário pode ser devolvido para nova tentativa). Sem log de token
 * nem de corpo.
 */
export function createExpoSender(expo: Expo): DeviceSender {
  return async (devices, payload) => {
    const gone: string[] = [];
    const valid = devices.filter((d) => {
      if (Expo.isExpoPushToken(d.token)) return true;
      gone.push(d.token); // não é token do Expo: não adianta guardar
      return false;
    });
    const messages: ExpoPushMessage[] = valid.map((d) => ({
      to: d.token, title: payload.title, body: payload.body, data: { url: payload.url, tag: payload.tag },
      sound: "default", priority: "high", channelId: "default",
    }));

    let sent = 0;
    let failures = 0;
    let lastError: unknown;
    let offset = 0;
    for (const chunk of expo.chunkPushNotifications(messages)) {
      const start = offset;
      offset += chunk.length;
      try {
        const tickets = await expo.sendPushNotificationsAsync(chunk);
        tickets.forEach((ticket, i) => {
          if (ticket.status === "ok") sent++;
          else if (ticket.details?.error === "DeviceNotRegistered") gone.push(valid[start + i].token);
          else {
            failures++;
            lastError = new Error(`expo ticket: ${ticket.details?.error ?? "erro"}`);
          }
        });
      } catch (err) {
        failures += chunk.length;
        lastError = err;
      }
    }
    if (sent === 0 && failures > 0) throw lastError instanceof Error ? lastError : new Error("push (expo) falhou");
    return { sent, gone };
  };
}

export const expoSender: DeviceSender = (devices, payload) =>
  createExpoSender(new Expo({ accessToken: process.env.EXPO_ACCESS_TOKEN }))(devices, payload);
