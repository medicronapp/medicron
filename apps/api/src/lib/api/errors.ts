/** Erro com status HTTP e código estável, convertido em JSON por `route()`. */
export class ApiError extends Error {
  /** `details` entram no corpo da resposta ao lado de `error` e `message` (ex.: `{ limit: "patients" }`). */
  constructor(public status: number, public code: string, message?: string, public details?: Record<string, unknown>) {
    super(message ?? code);
  }
}
