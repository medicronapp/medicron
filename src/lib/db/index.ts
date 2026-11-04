import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import * as schema from "./schema";

/** Tipo comum ao driver Neon (produção) e ao PGlite (testes). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let _db: Db | undefined;
/** Conexão preguiçosa: só exige DATABASE_URL quando realmente usada. */
export function getDb(): Db {
  if (!_db) {
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    _db = drizzle(pool, { schema }) as unknown as Db;
  }
  return _db;
}
