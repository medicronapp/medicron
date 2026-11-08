import type { PatientBody, PatientDto } from "@medicron/shared";
import type { ApiClient } from "./client";

export const fetchPatients = async (c: ApiClient) => (await c.request<{ patients: PatientDto[] }>("GET", "/patients")).patients;
export const fetchPatient = async (c: ApiClient, id: string) => (await c.request<{ patient: PatientDto }>("GET", `/patients/${id}`)).patient;
export const createPatient = async (c: ApiClient, body: PatientBody) => (await c.request<{ patient: PatientDto }>("POST", "/patients", body)).patient;
export const updatePatient = async (c: ApiClient, id: string, body: PatientBody) => (await c.request<{ patient: PatientDto }>("PATCH", `/patients/${id}`, body)).patient;
export const archivePatient = (c: ApiClient, id: string) => c.request<void>("DELETE", `/patients/${id}`);
