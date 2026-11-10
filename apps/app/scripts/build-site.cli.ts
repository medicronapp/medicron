// Uso (dentro de apps/app): npm run build-site
// Variáveis opcionais: CONTACT_EMAIL, LANDING_APP_STORE_URL, LANDING_PLAY_URL.
import path from "node:path";
import { buildSite } from "./build-site.ts";

const appRoot = path.resolve(import.meta.dirname, "..");
buildSite(
  { contactEmail: process.env.CONTACT_EMAIL, appStoreUrl: process.env.LANDING_APP_STORE_URL, playUrl: process.env.LANDING_PLAY_URL },
  appRoot,
);
console.log("hotsite gerado em public/landing");
