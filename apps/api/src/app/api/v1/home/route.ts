import { z } from "zod";
import type { HomeDto, OnboardingDto } from "@medicron/shared";
import { serializeHome } from "@/components/home/serialize";
import { getDb } from "@/lib/db";
import { getApiContext } from "@/lib/api/context";
import { json, route } from "@/lib/api/route";
import { getHome } from "@/lib/services/home";
import { getOnboarding } from "@/lib/services/onboarding";
import { listPatients } from "@/lib/services/patients";

export const dynamic = "force-dynamic";

// Dia que não existe no calendário (ex.: 2026-02-31) é ignorado, como o serviço já faz com datas futuras.
const dia = z.string().date().optional().catch(undefined);

export const GET = route(async (req) => {
  const { orgId, userId } = await getApiContext();
  const db = getDb();
  const now = new Date();
  const selected = dia.parse(new URL(req.url).searchParams.get("dia") ?? undefined);
  const [home, patients, onboarding] = await Promise.all([
    getHome(db, orgId, now, selected), listPatients(db, orgId), getOnboarding(db, userId, orgId),
  ]);
  return json({
    home: serializeHome(home, now) as HomeDto,
    hasPatients: patients.length > 0,
    onboarding: onboarding as OnboardingDto,
  });
});
