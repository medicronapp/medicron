import { getDb } from "@/lib/db";
import { getOrgContext } from "@/lib/session";
import { listPatients } from "@/lib/services/patients";
import { getHome } from "@/lib/services/home";
import { HomeView } from "@/components/home/home-view";
import { serializeHome } from "@/components/home/serialize";

export default async function Page({ searchParams }: { searchParams: Promise<{ dia?: string }> }) {
  const { dia } = await searchParams;
  const { orgId } = await getOrgContext();
  const db = getDb();
  const now = new Date();
  const [home, patients] = await Promise.all([getHome(db, orgId, now, dia), listPatients(db, orgId)]);
  return <HomeView home={serializeHome(home, now)} hasPatients={patients.length > 0} />;
}
