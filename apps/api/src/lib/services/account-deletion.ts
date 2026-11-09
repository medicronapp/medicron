import { and, asc, eq, ne } from "drizzle-orm";
import type { Db } from "@/lib/db";
import {
  carePlans, careSlots, doseLogs, items, member, organization, patients, pushDevices, pushSubscriptions,
} from "@/lib/db/schema";

/**
 * Apaga o que é do usuário no app, antes de a conta dele ser excluída (o `better-auth` apaga o usuário, as sessões e as
 * contas de login depois). Tudo em **uma transação**: se algo falhar, nada fica pela metade.
 *
 * - Organização em que ele é a **única pessoa**: some com tudo o que é dela (doses, horários, rotinas, pacientes, itens).
 * - Organização com outras pessoas: os dados ficam; se ele era o único dono, a posse passa para um administrador (o mais
 *   antigo) ou, na falta, para o membro mais antigo; em seguida o vínculo dele sai.
 * - Inscrições de Web Push e aparelhos de push do usuário saem.
 */
export async function purgeUserData(
  db: Db, userId: string,
): Promise<{ deletedOrganizations: string[]; leftOrganizations: string[] }> {
  return db.transaction(async (tx) => {
    const deletedOrganizations: string[] = [];
    const leftOrganizations: string[] = [];
    const memberships = await tx.select().from(member).where(eq(member.userId, userId));

    for (const mine of memberships) {
      const orgId = mine.organizationId;
      const others = await tx.select().from(member)
        .where(and(eq(member.organizationId, orgId), ne(member.userId, userId)))
        .orderBy(asc(member.createdAt));

      if (others.length === 0) {
        await tx.delete(doseLogs).where(eq(doseLogs.organizationId, orgId));
        await tx.delete(careSlots).where(eq(careSlots.organizationId, orgId));
        await tx.delete(carePlans).where(eq(carePlans.organizationId, orgId));
        await tx.delete(patients).where(eq(patients.organizationId, orgId));
        await tx.delete(items).where(eq(items.organizationId, orgId));
        await tx.delete(organization).where(eq(organization.id, orgId)); // vínculos e convites saem em cascata
        deletedOrganizations.push(orgId);
        continue;
      }

      if (mine.role === "owner" && !others.some((o) => o.role === "owner")) {
        const heir = others.find((o) => o.role === "admin") ?? others[0];
        await tx.update(member).set({ role: "owner" }).where(eq(member.id, heir.id));
      }
      await tx.delete(member).where(eq(member.id, mine.id));
      leftOrganizations.push(orgId);
    }

    await tx.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, userId));
    await tx.delete(pushDevices).where(eq(pushDevices.userId, userId));
    return { deletedOrganizations, leftOrganizations };
  });
}
