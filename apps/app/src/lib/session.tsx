import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { queryClient } from "@/lib/api/query";

type Common = { signOut: () => Promise<void> };
export type AppSession =
  | ({ status: "loading"; orgCount: 0; activeOrgId: null } & Common)
  | ({ status: "signedOut"; orgCount: 0; activeOrgId: null } & Common)
  | ({ status: "error"; orgCount: 0; activeOrgId: null; retry: () => void } & Common)
  | ({ status: "signedIn"; orgCount: number; activeOrgId: string | null } & Common);

/** Sessão + contas do usuário, numa forma só para a casca de navegação. */
export function useAppSession(): AppSession {
  const session = authClient.useSession();
  const orgs = authClient.useListOrganizations();
  const userId = (session.data as { user?: { id?: string } } | null)?.user?.id ?? null;

  // O better-auth só rebusca a lista de contas quando uma conta é criada/alterada, e não ao entrar ou sair:
  // sem isto a lista fica nula depois do login (ou mostra as contas de quem saiu).
  useEffect(() => {
    if (!session.isPending) authClient.$store.notify("$listOrg");
  }, [userId, session.isPending]);

  async function signOut() {
    await authClient.signOut();
    queryClient.clear(); // nada de dados do usuário anterior para o próximo
  }

  if (session.isPending) return { status: "loading", orgCount: 0, activeOrgId: null, signOut };
  if (!session.data) return { status: "signedOut", orgCount: 0, activeOrgId: null, signOut };
  if (orgs.data == null && orgs.error) {
    return { status: "error", orgCount: 0, activeOrgId: null, signOut, retry: () => authClient.$store.notify("$listOrg") };
  }
  // Logo após o login a lista pode ainda não ter sido buscada (nula): esperar, e não concluir "sem conta".
  if (orgs.isPending || orgs.data == null) return { status: "loading", orgCount: 0, activeOrgId: null, signOut };
  const activeOrgId =
    (session.data as { session?: { activeOrganizationId?: string | null } }).session?.activeOrganizationId ?? null;
  return { status: "signedIn", orgCount: orgs.data.length, activeOrgId, signOut };
}
