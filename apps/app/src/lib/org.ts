import { authClient } from "@/lib/auth-client";
import { resetAccountData } from "@/lib/api/query";

export type InvitationInfo = { status: string; organizationName: string; inviterEmail: string };

const messageOf = (error: unknown): string | undefined => (error as { message?: string } | null)?.message || undefined;

/** Convida por e-mail e devolve o id do convite (o link é `inviteLink(id, inviteBase())`). */
export async function inviteMember(email: string, role: "admin" | "member"): Promise<{ id: string }> {
  const { data, error } = await authClient.organization.inviteMember({ email, role });
  if (error || !data) {
    // Leva o `code` do better-auth junto: convidar além do limite de pessoas vira paywall (isPlanLimit), não mensagem em inglês.
    throw Object.assign(new Error(messageOf(error) ?? "Não foi possível criar o convite."), { code: (error as { code?: string } | null)?.code });
  }
  return { id: data.id };
}

export async function cancelInvitation(id: string): Promise<void> {
  const { error } = await authClient.organization.cancelInvitation({ invitationId: id });
  if (error) throw new Error("Não foi possível cancelar o convite.");
}

/**
 * Dados do convite, ou `null` quando a API diz que ele não existe ou não é do usuário. Falha de rede **não** é `null`:
 * a exceção sobe para a tela mostrar "Tentar de novo" (sem rede o convite não está "indisponível").
 */
export async function getInvitation(id: string): Promise<InvitationInfo | null> {
  const { data, error } = await authClient.organization.getInvitation({ query: { id } });
  if (error || !data) return null;
  return { status: data.status, organizationName: data.organizationName, inviterEmail: data.inviterEmail };
}

/**
 * Aceita o convite e passa a usar a conta convidada: ativa a conta, avisa a lista de contas (o `better-auth` não faz isso
 * ao aceitar) e tira do cache tudo o que era da conta anterior.
 */
export async function acceptInvitation(id: string): Promise<{ organizationId: string }> {
  const { data, error } = await authClient.organization.acceptInvitation({ invitationId: id });
  if (error || !data) {
    if ((error as { code?: string } | null)?.code === "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED") {
      throw Object.assign(
        new Error("Esta conta já está com o número máximo de pessoas do plano grátis. Peça a quem convidou você para assinar o Medicron Plus."),
        { code: "ORGANIZATION_MEMBERSHIP_LIMIT_REACHED" },
      );
    }
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
