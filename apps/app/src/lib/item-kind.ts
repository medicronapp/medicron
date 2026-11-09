import type { ItemKind } from "@/lib/api/items";

/** Tipo vindo da rota (`?tipo=`): só "procedure" vale; qualquer outra coisa é medicação. */
export const kindFromParam = (tipo: unknown): ItemKind => (tipo === "procedure" ? "procedure" : "medication");
