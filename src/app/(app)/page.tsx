import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listCats } from "@/lib/services/cats";
import { getHome } from "@/lib/services/home";
import { HomeView } from "@/components/home/home-view";
import { serializeHome } from "@/components/home/serialize";

export default async function Page({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const { orgId } = await getOrgContext();
  const db = getDb();
  const now = new Date();
  const [home, cats] = await Promise.all([getHome(db, orgId, now, dia), listCats(db, orgId)]);
  return <HomeView home={serializeHome(home, now)} hasCats={cats.length > 0} />;
}
