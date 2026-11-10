let mockOS = "ios";

type Pkg = { identifier: string; product: { identifier: string; priceString: string; introPrice: null | { price: number; periodUnit: string; periodNumberOfUnits: number } } };
const mockPurchases = {
  configure: jest.fn(),
  logIn: jest.fn(async () => ({})),
  logOut: jest.fn(async () => ({})),
  getOfferings: jest.fn(),
  purchasePackage: jest.fn(),
  restorePurchases: jest.fn(),
  getAppUserID: jest.fn(),
  // iOS: elegibilidade do teste grátis (2 = elegível, 1 = inelegível); por padrão, todo mundo é elegível
  checkTrialOrIntroductoryPriceEligibility: jest.fn(async (ids: string[]) => Object.fromEntries(ids.map((i) => [i, { status: 2 }]))),
};

/** Carrega o módulo de compras isolado, com (ou sem) a chave pública do RevenueCat da plataforma. */
function load(key?: string) {
  jest.resetModules();
  delete process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  delete process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY;
  if (key) { process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY = key; process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY = key; }
  jest.doMock("react-native", () => ({ Platform: { get OS() { return mockOS; } } }));
  jest.doMock("react-native-purchases", () => ({ __esModule: true, default: mockPurchases }));
  let mod!: typeof import("@/lib/purchases");
  jest.isolateModules(() => { mod = require("@/lib/purchases"); });
  return mod;
}

const pkg = (id: string, priceString: string, intro: Pkg["product"]["introPrice"] = null): Pkg => ({ identifier: id, product: { identifier: `app.medicron.plus.${id.includes("annual") ? "annual" : "monthly"}`, priceString, introPrice: intro } });
const offerings = (monthly: Pkg | null, annual: Pkg | null) => ({ current: { monthly, annual } });

beforeEach(() => {
  jest.clearAllMocks();
  mockOS = "ios";
  mockPurchases.getAppUserID.mockResolvedValue("org1");
  mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockImplementation(async (ids: string[]) => Object.fromEntries(ids.map((i) => [i, { status: 2 }])));
});

describe("sem a chave do RevenueCat (ambiente sem cobrança)", () => {
  test("fica indisponível e não quebra: não configura, oferta nula", async () => {
    const p = load();
    expect(p.purchasesAvailable).toBe(false);
    await p.configurePurchases("org1");
    expect(mockPurchases.configure).not.toHaveBeenCalled();
    expect(await p.getOffer()).toBeNull();
    expect(await p.restore("org1")).toBe(false);
  });
});

describe("configurePurchases: a conta (organização) é o usuário do RevenueCat", () => {
  test("configura uma vez com a chave e a conta; repetir a mesma conta não refaz nada", async () => {
    const p = load("appl_chave");
    expect(p.purchasesAvailable).toBe(true);
    await p.configurePurchases("org1");
    expect(mockPurchases.configure).toHaveBeenCalledWith({ apiKey: "appl_chave", appUserID: "org1" });
    await p.configurePurchases("org1");
    expect(mockPurchases.configure).toHaveBeenCalledTimes(1);
    expect(mockPurchases.logIn).not.toHaveBeenCalled();
  });

  test("trocar de conta faz logIn da nova; sair (null) faz logOut; sair sem nunca ter configurado não faz nada", async () => {
    const p = load("appl_chave");
    await p.configurePurchases(null);
    expect(mockPurchases.logOut).not.toHaveBeenCalled();
    await p.configurePurchases("org1");
    await p.configurePurchases("org2");
    expect(mockPurchases.logIn).toHaveBeenCalledWith("org2");
    await p.configurePurchases(null);
    expect(mockPurchases.logOut).toHaveBeenCalledTimes(1);
    await p.configurePurchases("org1"); // voltou a entrar
    expect(mockPurchases.logIn).toHaveBeenLastCalledWith("org1");
  });

  test("erro do SDK não derruba o app (engole e deixa a compra indisponível até a próxima tentativa)", async () => {
    const p = load("appl_chave");
    mockPurchases.configure.mockImplementationOnce(() => { throw new Error("nativo"); });
    await expect(p.configurePurchases("org1")).resolves.toBeUndefined();
  });
});

describe("getOffer: preços e teste grátis vêm da loja, nunca do código", () => {
  test("mapeia mensal e anual com o priceString da loja; teste grátis de 7 dias (DAY × 7) no anual", async () => {
    const p = load("appl_chave");
    await p.configurePurchases("org1");
    mockPurchases.getOfferings.mockResolvedValue(offerings(
      pkg("$rc_monthly", "R$ 12,90"),
      pkg("$rc_annual", "R$ 89,90", { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7 }),
    ));
    expect(await p.getOffer()).toEqual({
      monthly: { id: "$rc_monthly", priceString: "R$ 12,90", period: "month", trial: null },
      annual: { id: "$rc_annual", priceString: "R$ 89,90", period: "year", trial: { days: 7 } },
    });
  });

  test("1 semana grátis vira 7 dias; oferta introdutória PAGA (price > 0) não é teste grátis", async () => {
    const p = load("appl_chave");
    await p.configurePurchases("org1");
    mockPurchases.getOfferings.mockResolvedValue(offerings(
      pkg("$rc_monthly", "R$ 12,90", { price: 4.9, periodUnit: "MONTH", periodNumberOfUnits: 1 }),
      pkg("$rc_annual", "R$ 89,90", { price: 0, periodUnit: "WEEK", periodNumberOfUnits: 1 }),
    ));
    const o = await p.getOffer();
    expect(o?.monthly.trial).toBeNull();
    expect(o?.annual.trial).toEqual({ days: 7 });
  });

  test("sem oferta atual, ou sem os dois pacotes: null (a tela mostra erro, não quebra)", async () => {
    const p = load("appl_chave");
    await p.configurePurchases("org1");
    mockPurchases.getOfferings.mockResolvedValueOnce({ current: null });
    expect(await p.getOffer()).toBeNull();
    mockPurchases.getOfferings.mockResolvedValueOnce(offerings(pkg("$rc_monthly", "R$ 12,90"), null));
    expect(await p.getOffer()).toBeNull();
  });
});

describe("teste grátis só para quem é elegível (iOS)", () => {
  const intro = { price: 0, periodUnit: "DAY", periodNumberOfUnits: 7 };
  async function offerWith(status: number | "erro", os = "ios") {
    mockOS = os;
    mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockClear();
    const p = load("appl_chave");
    await p.configurePurchases("org1");
    mockPurchases.getOfferings.mockResolvedValue(offerings(pkg("$rc_monthly", "R$ 12,90"), pkg("$rc_annual", "R$ 89,90", intro)));
    if (status === "erro") mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockRejectedValue(new Error("falhou"));
    else mockPurchases.checkTrialOrIntroductoryPriceEligibility.mockResolvedValue({ "app.medicron.plus.annual": { status } });
    return { p, offer: (await p.getOffer())! };
  }

  test("elegível: mostra os 7 dias; inelegível (já usou o teste): NÃO promete teste grátis", async () => {
    expect((await offerWith(2)).offer.annual.trial).toEqual({ days: 7 });
    expect((await offerWith(1)).offer.annual.trial).toBeNull();
  });

  test("não sabe (0) ou a checagem falha: no iOS não promete (melhor omitir que cobrar sem avisar)", async () => {
    expect((await offerWith(0)).offer.annual.trial).toBeNull();
    expect((await offerWith("erro")).offer.annual.trial).toBeNull();
  });

  test("Android: não chama a checagem (o Google decide a oferta) e usa o teste informado", async () => {
    const { offer } = await offerWith(1, "android");
    expect(mockPurchases.checkTrialOrIntroductoryPriceEligibility).not.toHaveBeenCalled();
    expect(offer.annual.trial).toEqual({ days: 7 });
  });
});

describe("a compra e a restauração vão para a conta certa", () => {
  async function ready() {
    const p = load("appl_chave");
    await p.configurePurchases("org1");
    mockPurchases.getOfferings.mockResolvedValue(offerings(pkg("$rc_monthly", "R$ 12,90"), pkg("$rc_annual", "R$ 89,90")));
    return { p, offer: (await p.getOffer())! };
  }

  test("se o SDK está com outra conta, refaz o logIn ANTES de comprar", async () => {
    const { p, offer } = await ready();
    mockPurchases.getAppUserID.mockResolvedValue("org-antiga");
    mockPurchases.purchasePackage.mockResolvedValue({ customerInfo: {} });
    await p.purchase(offer.annual, "org1");
    expect(mockPurchases.logIn).toHaveBeenCalledWith("org1");
    expect(mockPurchases.logIn.mock.invocationCallOrder[0]).toBeLessThan(mockPurchases.purchasePackage.mock.invocationCallOrder[0]);
  });

  test("se o logIn falha, NÃO compra (o dinheiro iria para a conta errada) e avisa em português", async () => {
    const { p, offer } = await ready();
    mockPurchases.getAppUserID.mockResolvedValue("org-antiga");
    mockPurchases.logIn.mockRejectedValueOnce(new Error("rede"));
    await expect(p.purchase(offer.annual, "org1")).rejects.toThrow("Não foi possível confirmar a sua conta. Tente de novo.");
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
  });

  test("conta já certa: não refaz o logIn; restore também confere a conta antes", async () => {
    const { p, offer } = await ready();
    mockPurchases.purchasePackage.mockResolvedValue({ customerInfo: {} });
    await p.purchase(offer.monthly, "org1");
    expect(mockPurchases.logIn).not.toHaveBeenCalled();
    mockPurchases.getAppUserID.mockResolvedValue("outra");
    mockPurchases.restorePurchases.mockResolvedValue({ entitlements: { active: {} } });
    await p.restore("org1");
    expect(mockPurchases.logIn).toHaveBeenCalledWith("org1");
  });
});

describe("purchase e restore", () => {
  async function ready() {
    const p = load("appl_chave");
    await p.configurePurchases("org1");
    mockPurchases.getOfferings.mockResolvedValue(offerings(pkg("$rc_monthly", "R$ 12,90"), pkg("$rc_annual", "R$ 89,90")));
    const offer = (await p.getOffer())!;
    return { p, offer };
  }

  test("compra concluída devolve 'purchased' e usa o pacote nativo certo", async () => {
    const { p, offer } = await ready();
    mockPurchases.purchasePackage.mockResolvedValue({ customerInfo: {} });
    expect(await p.purchase(offer.annual, "org1")).toBe("purchased");
    expect(mockPurchases.purchasePackage.mock.calls[0][0].identifier).toBe("$rc_annual");
  });

  test("o usuário cancelar a folha da loja devolve 'cancelled' (não é erro)", async () => {
    const { p, offer } = await ready();
    mockPurchases.purchasePackage.mockRejectedValue({ userCancelled: true });
    expect(await p.purchase(offer.monthly, "org1")).toBe("cancelled");
  });

  test("outros erros sobem (a tela mostra a mensagem)", async () => {
    const { p, offer } = await ready();
    mockPurchases.purchasePackage.mockRejectedValue(Object.assign(new Error("Pagamento recusado"), { userCancelled: false }));
    await expect(p.purchase(offer.monthly, "org1")).rejects.toThrow("Pagamento recusado");
  });

  test("restore: verdadeiro se o entitlement 'plus' está ativo, falso se não", async () => {
    const { p } = await ready();
    mockPurchases.restorePurchases.mockResolvedValueOnce({ entitlements: { active: { plus: {} } } });
    expect(await p.restore("org1")).toBe(true);
    mockPurchases.restorePurchases.mockResolvedValueOnce({ entitlements: { active: {} } });
    expect(await p.restore("org1")).toBe(false);
  });

  test("manageUrl: iOS aponta para as assinaturas da Apple; Android, para as do Google Play", () => {
    const p = load("appl_chave");
    expect(p.manageUrl()).toBe("https://apps.apple.com/account/subscriptions");
    mockOS = "android";
    expect(p.manageUrl()).toBe("https://play.google.com/store/account/subscriptions");
  });
});

describe("web: não há compra", () => {
  test("a versão web é neutra (indisponível, sem oferta, sem restaurar)", async () => {
    jest.resetModules();
    const w = require("@/lib/purchases.web") as typeof import("@/lib/purchases");
    expect(w.purchasesAvailable).toBe(false);
    await expect(w.configurePurchases("org1")).resolves.toBeUndefined();
    expect(await w.getOffer()).toBeNull();
    expect(await w.restore("org1")).toBe(false);
  });
});
