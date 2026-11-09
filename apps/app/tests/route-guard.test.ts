import { decideRoute } from "@/lib/route-guard";

const base = { hasSession: true, orgCount: 1, activeOrgId: "o1", pathname: "/" };

describe("decideRoute", () => {
  test("sem sessão em rota protegida vai para /entrar guardando o destino", () => {
    expect(decideRoute({ ...base, hasSession: false, pathname: "/pacientes" })).toEqual({ to: "/entrar?next=%2Fpacientes" });
  });
  test("o destino leva a query junto, codificada", () => {
    expect(decideRoute({ ...base, hasSession: false, pathname: "/pacientes?aba=dados" })).toEqual({ to: "/entrar?next=%2Fpacientes%3Faba%3Ddados" });
  });
  test("sem sessão na raiz vai para /entrar sem next (a raiz é o destino padrão)", () => {
    expect(decideRoute({ ...base, hasSession: false, pathname: "/" })).toEqual({ to: "/entrar" });
  });
  test("sem sessão em rota pública fica onde está", () => {
    expect(decideRoute({ ...base, hasSession: false, pathname: "/entrar" })).toEqual({ to: null });
    expect(decideRoute({ ...base, hasSession: false, pathname: "/cadastrar?next=%2Fconvite%2Fx" })).toEqual({ to: null });
  });
  test("com sessão e sem nenhuma conta vai para /nova-conta", () => {
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/" })).toEqual({ to: "/nova-conta" });
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/nova-conta" })).toEqual({ to: null });
  });
  test("com sessão em rota pública volta para a raiz", () => {
    expect(decideRoute({ ...base, pathname: "/entrar" })).toEqual({ to: "/" });
    expect(decideRoute({ ...base, pathname: "/cadastrar" })).toEqual({ to: "/" });
  });
  test("com sessão e conta, o resto fica como está (inclusive /nova-conta, para criar outra casa)", () => {
    expect(decideRoute({ ...base, pathname: "/pacientes" })).toEqual({ to: null });
    expect(decideRoute({ ...base, pathname: "/nova-conta" })).toEqual({ to: null });
  });

  test("convite sem sessão vai para Criar conta (como o site), guardando o destino", () => {
    expect(decideRoute({ ...base, hasSession: false, pathname: "/convite/abc" })).toEqual({ to: "/cadastrar?next=%2Fconvite%2Fabc" });
  });
  test("convidado com sessão e sem nenhuma conta fica no convite (não vai para Nova conta antes de aceitar)", () => {
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/convite/abc" })).toEqual({ to: null });
  });
  test("sem conta, o resto continua indo para Nova conta", () => {
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/" })).toEqual({ to: "/nova-conta" });
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/conviteabc" })).toEqual({ to: "/nova-conta" });
  });
  test("com sessão e contas, o convite fica onde está", () => {
    expect(decideRoute({ ...base, pathname: "/convite/abc" })).toEqual({ to: null });
  });

  test("com sessão numa tela de acesso, vai para o destino guardado em `next` (e não sempre para a raiz)", () => {
    expect(decideRoute({ ...base, pathname: "/entrar?next=%2Fpacientes" })).toEqual({ to: "/pacientes" });
    expect(decideRoute({ ...base, pathname: "/cadastrar?next=%2Fconvite%2Fabc" })).toEqual({ to: "/convite/abc" });
  });
  test("`next` malicioso ou ausente cai na raiz", () => {
    expect(decideRoute({ ...base, pathname: "/entrar?next=https%3A%2F%2Fevil.com" })).toEqual({ to: "/" });
    expect(decideRoute({ ...base, pathname: "/entrar?next=%2F%2Fevil.com" })).toEqual({ to: "/" });
    expect(decideRoute({ ...base, pathname: "/entrar" })).toEqual({ to: "/" });
  });
  test("convidado recém-cadastrado (0 contas) numa tela de acesso com next=/convite/… vai para o convite, não para Nova conta", () => {
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/cadastrar?next=%2Fconvite%2Fabc" })).toEqual({ to: "/convite/abc" });
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/cadastrar?next=%2Fpacientes" })).toEqual({ to: "/nova-conta" });
    expect(decideRoute({ ...base, orgCount: 0, activeOrgId: null, pathname: "/cadastrar" })).toEqual({ to: "/nova-conta" });
  });
});
