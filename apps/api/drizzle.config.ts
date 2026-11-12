import { existsSync } from "node:fs";
import { defineConfig } from "drizzle-kit";

// O drizzle-kit não lê o .env.local sozinho: carrega aqui (valores já definidos no ambiente têm precedência).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  // Migrações usam a conexão direta (sem pooler) quando existe.
  dbCredentials: { url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "" },
});
