/** Erro de uma chamada à API: status HTTP (0 = sem rede), código estável e mensagem em português. */
export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public issues?: unknown[],
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

/** 426: esta versão do app não é mais aceita pela API. */
export class AppOutdatedError extends ApiClientError {
  constructor(public minAppVersion: string, message = "Atualize o app para continuar.") {
    super(426, "app_outdated", message);
    this.name = "AppOutdatedError";
  }
}

/** 401: sem sessão (ou sessão expirada). */
export class UnauthorizedError extends ApiClientError {
  constructor(message = "É preciso entrar para continuar.") {
    super(401, "unauthorized", message);
    this.name = "UnauthorizedError";
  }
}
