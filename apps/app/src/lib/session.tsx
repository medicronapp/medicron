import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/api/query";

export type AppSession =
  | { status: "loading"; orgCount: 0; activeOrgId: null; signOut: () => Promise<void> }
  | { status: "signedOut"; orgCount: 0; activeOrgId: null; signOut: () => Promise<void> }
  | { status: "signedIn"; orgCount: number; activeOrgId: string | null; signOut: () => Promise<void> };

/** Sessão + contas do usuário, numa forma só para a casca de navegação. */
export function useAppSession(): AppSession {
  const session = authClient.useSession();
  const orgs = authClient.useListOrganizations();

  async function signOut() {
    await authClient.signOut();
    queryClient.clear(); // nada de dados do usuário anterior para o próximo
  }

  if (session.isPending) return { status: "loading", orgCount: 0, activeOrgId: null, signOut };
  if (!session.data) return { status: "signedOut", orgCount: 0, activeOrgId: null, signOut };
  if (orgs.isPending) return { status: "loading", orgCount: 0, activeOrgId: null, signOut };
  const activeOrgId =
    (session.data as { session?: { activeOrganizationId?: string | null } }).session?.activeOrganizationId ?? null;
  return { status: "signedIn", orgCount: orgs.data?.length ?? 0, activeOrgId, signOut };
}
