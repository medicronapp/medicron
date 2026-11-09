import { assetLinks, jsonOrNotFound } from "@/lib/app-links";

export const dynamic = "force-dynamic";

export async function GET() {
  return jsonOrNotFound(assetLinks(process.env));
}
