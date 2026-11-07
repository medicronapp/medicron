export type GuardInput = {
  hasSession: boolean;
  orgCount: number;
  activeOrgId: string | null;
  /** Caminho com a query, ex.: `/pacientes?aba=dados`. */
  pathname: string;
};

const PUBLIC = new Set(["/entrar", "/cadastrar"]);

const pathOnly = (p: string) => p.split("?")[0];

/** Decide se a rota atual precisa redirecionar. `to: null` = ficar onde está. */
export function decideRoute({ hasSession, orgCount, pathname }: GuardInput): { to: string | null } {
  const path = pathOnly(pathname);
  const isPublic = PUBLIC.has(path);

  if (!hasSession) {
    if (isPublic) return { to: null };
    return { to: pathname === "/" ? "/entrar" : `/entrar?next=${encodeURIComponent(pathname)}` };
  }
  if (orgCount === 0) return { to: path === "/nova-conta" ? null : "/nova-conta" };
  if (isPublic) return { to: "/" };
  return { to: null };
}
