// Uso (dentro de apps/app, depois do expo export): node scripts/finalize-web.cli.ts
import path from "node:path";
import { finalizeWeb } from "./finalize-web.ts";

finalizeWeb(path.resolve(import.meta.dirname, "..", "dist"));
console.log("dist/index.html -> dist/app.html");
