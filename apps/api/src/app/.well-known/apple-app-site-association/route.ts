import { appleAppSiteAssociation, jsonOrNotFound } from "@/lib/app-links";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOrNotFound(appleAppSiteAssociation(process.env));
}
