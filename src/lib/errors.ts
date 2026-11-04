export class NotFound extends Error {
  constructor(what = "Registro") {
    super(`${what} não encontrado`);
  }
}
