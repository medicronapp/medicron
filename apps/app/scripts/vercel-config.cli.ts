// Uso (dentro de apps/app): npm run vercel-config
import { writeFileSync } from "node:fs";
import path from "node:path";
import { buildVercelConfig } from "./vercel-config.ts";

const API_ORIGIN = "https://medicron.vercel.app";
writeFileSync(path.join(import.meta.dirname, "..", "vercel.json"), JSON.stringify(buildVercelConfig(API_ORIGIN), null, 2) + "\n");
