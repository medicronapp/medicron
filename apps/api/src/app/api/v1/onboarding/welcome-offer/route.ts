import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { noContent, route } from "@/lib/api/route";
import { markWelcomeOfferSeen } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";

/** O app exibiu a oferta de boas-vindas: nunca mais será oferecida a este usuário. */
export const POST = route(async () => {
  const { userId } = await getApiContext();
  await markWelcomeOfferSeen(getDb(), userId);
  return noContent();
});
