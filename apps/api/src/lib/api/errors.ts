/** Erro com status HTTP e código estável, convertido em JSON por `route()`. */
export class ApiError extends Error {
  constructor(public status: number, public code: string, message?: string) {
    super(message ?? code);
  }
}
