import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { noContent, route } from "@/lib/api/route";
import { markWelcomeSeen } from "@/lib/services/onboarding";

export const dynamic = "force-dynamic";

export const POST = route(async () => {
  const { userId } = await getApiContext();
  await markWelcomeSeen(getDb(), userId);
  return noContent();
});
