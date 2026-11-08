import type { PlanCreateBody, PlanDto, PlanPatchBody } from "@medicron/shared";
import type { ApiClient } from "./client";

export const fetchPlans = async (c: ApiClient, patientId: string) => (await c.request<{ plans: PlanDto[] }>("GET", `/patients/${patientId}/plans`)).plans;
export const createPlan = async (c: ApiClient, patientId: string, body: PlanCreateBody) => (await c.request<{ plan: PlanDto }>("POST", `/patients/${patientId}/plans`, body)).plan;
export const updatePlan = async (c: ApiClient, planId: string, body: PlanPatchBody) => (await c.request<{ plan: PlanDto }>("PATCH", `/plans/${planId}`, body)).plan;
export const deactivatePlan = (c: ApiClient, planId: string) => c.request<void>("DELETE", `/plans/${planId}`);
