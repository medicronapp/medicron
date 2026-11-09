import { authClient } from "@/lib/auth-client";
import { resetAccountData } from "@/lib/api/query";

export type InvitationInfo = { status: string; organizationName: string; inviterEmail: string };

const messageOf = (error: unknown): string | undefined => (error as { message?: string } | null)?.message || undefined;

/** Convida por e-mail e devolve o id do convite (o link é `inviteLink(id, API_URL)`). */
export async function inviteMember(email: string, role: "admin" | "member"): Promise<{ id: string }> {
  const { data, error } = await authClient.organization.inviteMember({ email, role });
  if (error || !data) throw new Error(messageOf(error) ?? "Não foi possível criar o convite.");
  return { id: data.id };
}

export async function cancelInvitation(id: string): Promise<void> {
  const { error } = await authClient.organization.cancelInvitation({ invitationId: id });
  if (error) throw new Error("Não foi possível cancelar o convite.");
}

/** Dados do convite, ou `null` quando ele não existe, não é do usuário ou a consulta falha. */
export async function getInvitation(id: string): Promise<InvitationInfo | null> {
  try {
    const { data, error } = await authClient.organization.getInvitation({ query: { id } });
    if (error || !data) return null;
    return { status: data.status, organizationName: data.organizationName, inviterEmail: data.inviterEmail };
  } catch {
    return null;
  }
}

/**
 * Aceita o convite e passa a usar a conta convidada: ativa a conta, avisa a lista de contas (o `better-auth` não faz isso
 * ao aceitar) e tira do cache tudo o que era da conta anterior.
 */
export async function acceptInvitation(id: string): Promise<{ organizationId: string }> {
  const { data, error } = await authClient.organization.acceptInvitation({ invitationId: id });
  if (error || !data) {
    throw new Error("Não foi possível aceitar o convite (talvez você já seja membro ou o convite seja de outro e-mail).");
  }
  const organizationId = data.invitation.organizationId;
  await authClient.organization.setActive({ organizationId });
  authClient.$store.notify("$listOrg");
  await resetAccountData();
  return { organizationId };
}

/** Organização ativa com membros e convites (atualiza sozinha a cada ação de organização). */
export const useActiveOrganization = () => authClient.useActiveOrganization();
