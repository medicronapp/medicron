export type GuardInput = {
  hasSession: boolean;
  orgCount: number;
  activeOrgId: string | null;
  /** Caminho com a query, ex.: `/pacientes?aba=dados`. */
  pathname: string;
};

const PUBLIC = new Set(["/entrar", "/cadastrar"]);

const pathOnly = (p: string) => p.split("?")[0];
const isInvite = (path: string) => path.startsWith("/convite/");

/** Decide se a rota atual precisa redirecionar. `to: null` = ficar onde está. */
export function decideRoute({ hasSession, orgCount, pathname }: GuardInput): { to: string | null } {
  const path = pathOnly(pathname);
  const isPublic = PUBLIC.has(path);

  if (!hasSession) {
    if (isPublic) return { to: null };
    // Quem chega por um link de convite costuma não ter conta: vai para Criar conta (como o site) e volta ao convite.
    if (isInvite(path)) return { to: `/cadastrar?next=${encodeURIComponent(pathname)}` };
    return { to: pathname === "/" ? "/entrar" : `/entrar?next=${encodeURIComponent(pathname)}` };
  }
  // Convidado recém-cadastrado ainda não tem conta: pode ver o convite (aceitar é o que cria o vínculo).
  if (orgCount === 0) return { to: path === "/nova-conta" || isInvite(path) ? null : "/nova-conta" };
  if (isPublic) return { to: "/" };
  return { to: null };
}
