import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { FREE_LIMITS } from "@medicron/shared";
import { errorMessage } from "@/lib/api/errors";
import { useMe } from "@/lib/me-query";
import { getOffer, manageUrl, previewPaywall, purchase, purchasesAvailable, restore, type Offer } from "@/lib/purchases";
import { afterPurchase, useSubscription } from "@/lib/subscription-queries";
import { formatDay } from "@/components/plus-card";
import { PRIVACY_URL, TERMS_URL } from "@/components/legal-note";
import { PageHeader } from "@/components/page-header";
import { PlusBenefits } from "@/components/plus-benefits";
import { PlusHero } from "@/components/plus-hero";
import { Screen } from "@/components/screen";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

type Choice = "annual" | "monthly";

const HERO_TITLE: Record<string, string> = {
  patients: "Cuide de mais gente com o Plus",
  members: "Traga mais gente para cuidar junto",
  history: "Veja todo o histórico do cuidado",
};
const DEFAULT_TITLE = "Tudo liberado com o Plus";
/** Abaixo disso a economia do anual não vale como argumento de venda. */
const MIN_SAVINGS = 5;

const cancelHint = () => (Platform.OS === "ios" || previewPaywall ? "nos Ajustes da App Store" : "no Google Play");

/** Paywall do Medicron Plus. Preços e teste grátis vêm da loja (nada fixo no código). O essencial continua grátis. */
export default function Plus() {
  const router = useRouter();
  const { motivo } = useLocalSearchParams<{ motivo?: string }>();
  const me = useMe();
  const { subscription, isPlus } = useSubscription();
  const role = me.data?.role;
  const orgId = me.data?.orgId;
  const isAdmin = role === "owner" || role === "admin";
  const native = (Platform.OS !== "web" || previewPaywall) && purchasesAvailable;
  const canBuy = !isPlus && isAdmin && native;

  const [offer, setOffer] = useState<Offer | null>(null);
  const [offerState, setOfferState] = useState<"idle" | "loading" | "error">("idle");
  const [choice, setChoice] = useState<Choice>("annual");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    setOfferState("loading");
    getOffer().then((o) => { setOffer(o); setOfferState(o ? "idle" : "error"); }).catch(() => setOfferState("error"));
  }, []);
  useEffect(() => { if (canBuy) load(); }, [canBuy, load]);

  // O motivo fala dos limites do plano GRÁTIS (nunca os da conta, que no Plus são ilimitados) e some se a conta já é Plus.
  const reason = isPlus ? null
    : motivo === "patients" ? `Você chegou ao limite de ${FREE_LIMITS.patients} pacientes do plano grátis.`
    : motivo === "members" ? `Você chegou ao limite de ${FREE_LIMITS.members} pessoas na conta do plano grátis.`
    : motivo === "history" ? `O plano grátis mostra os últimos ${FREE_LIMITS.historyDays} dias do histórico.`
    : null;

  async function buy() {
    if (!offer || !orgId || busy) return;
    setBusy(true);
    setError("");
    try {
      if ((await purchase(offer[choice], orgId)) === "purchased") {
        if (await afterPurchase()) toast.success("Medicron Plus ativado");
        else toast.info("Compra concluída. O Plus será ativado em instantes.");
        router.back();
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function restorePurchases() {
    if (busy || !orgId) return;
    setBusy(true);
    try {
      if (await restore(orgId)) {
        await afterPurchase();
        toast.success("Assinatura restaurada");
      } else {
        toast.info("Nenhuma assinatura encontrada para restaurar.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const pkg = offer?.[choice];
  const savings = offer?.annual.price && offer.monthly.price
    ? Math.round((1 - offer.annual.price / (offer.monthly.price * 12)) * 100)
    : null;
  const trial = choice === "annual" ? pkg?.trial : null;
  const terms = pkg
    ? `${trial ? `${trial.days} dias grátis, depois ` : ""}${pkg.priceString}/${pkg.period === "year" ? "ano" : "mês"}. Cancele quando quiser ${cancelHint()}.`
    : "";
  const chargeDay = trial ? formatDay(new Date(Date.now() + trial.days * 86_400_000).toISOString()) : null;

  return (
    <Screen>
      <PageHeader title="Medicron Plus" onBack={() => router.back()} />
      {isPlus ? null : (
        <PlusHero
          compact
          title={HERO_TITLE[motivo ?? ""] ?? DEFAULT_TITLE}
          subtitle={reason ?? "Sem limites para quem cuida de muita gente."}
        />
      )}
      <PlusBenefits compact />

      {isPlus && subscription ? (
        <View className="gap-3">
          <Text className="text-base font-semibold">{`Medicron Plus ativo até ${formatDay(subscription.plusUntil!)}`}</Text>
          {subscription.source === "manual" ? (
            <Text className="text-sm text-muted-foreground">Concedido pela equipe do Medicron.</Text>
          ) : (
            <Button variant="outline" size="lg" accessibilityLabel="Gerenciar assinatura" onPress={() => { void Linking.openURL(manageUrl()); }}>Gerenciar assinatura</Button>
          )}
        </View>
      ) : !role ? null : !isAdmin ? (
        <Text className="text-base text-muted-foreground">Peça a quem administra a conta para assinar.</Text>
      ) : Platform.OS === "web" && !previewPaywall ? (
        <Text className="text-base text-muted-foreground">Assine pelo aplicativo no celular.</Text>
      ) : !purchasesAvailable ? (
        <Text className="text-base text-muted-foreground">A assinatura não está disponível neste momento.</Text>
      ) : offerState === "loading" || (offerState === "idle" && !offer) ? (
        <View accessibilityLabel="Carregando planos" aria-busy className="gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </View>
      ) : offerState === "error" || !offer ? (
        <View className="gap-3">
          <Text className="text-base text-muted-foreground">Não foi possível carregar os planos.</Text>
          <Button variant="outline" size="lg" onPress={load} accessibilityLabel="Tentar de novo">Tentar de novo</Button>
        </View>
      ) : (
        <View className="gap-3">
          {(["annual", "monthly"] as const).map((c) => {
            const label = `${offer[c].priceString} por ${c === "annual" ? "ano" : "mês"}`;
            const on = choice === c;
            const annual = c === "annual";
            return (
              <Pressable
                key={c} accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={() => setChoice(c)}
                className={cn("min-h-16 justify-center gap-0.5 rounded-2xl border px-4 py-3", on ? "border-2 border-primary bg-brand-soft" : "border-border bg-card")}
              >
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-base font-semibold">{label}</Text>
                  {annual ? (
                    <View className="rounded-full bg-primary px-2.5 py-0.5">
                      <Text className="text-xs font-semibold text-primary-foreground">Melhor valor</Text>
                    </View>
                  ) : null}
                </View>
                {annual && offer.annual.pricePerMonthString ? (
                  <Text className="text-sm text-muted-foreground">{`Equivale a ${offer.annual.pricePerMonthString} por mês`}</Text>
                ) : null}
                {annual && savings !== null && savings >= MIN_SAVINGS ? (
                  <Text className="text-sm font-semibold text-brand-ink">{`Economize ${savings}%`}</Text>
                ) : null}
              </Pressable>
            );
          })}
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <Button size="lg" loading={busy} onPress={() => void buy()} accessibilityLabel={trial ? `Começar ${trial.days} dias grátis` : "Assinar"}>
            {trial ? `Começar ${trial.days} dias grátis` : "Assinar"}
          </Button>
          <Text className="text-sm text-muted-foreground">{terms}</Text>
          {chargeDay ? <Text className="text-sm text-muted-foreground">{`A cobrança acontece em ${chargeDay}, se você não cancelar antes.`}</Text> : null}
        </View>
      )}

      <Text className="text-sm text-muted-foreground">Continuam grátis: lembretes, a tela Hoje, marcar doses e widgets.</Text>
      {canBuy ? (
        <Button variant="ghost" size="lg" disabled={busy} onPress={() => void restorePurchases()} accessibilityLabel="Restaurar compras">Restaurar compras</Button>
      ) : null}
      <View className="flex-row justify-center gap-6">
        <Pressable accessibilityRole="link" accessibilityLabel="Termos de uso" onPress={() => { void Linking.openURL(TERMS_URL); }} className="min-h-11 items-center justify-center">
          <Text className="text-xs font-medium text-link underline">Termos de uso</Text>
        </Pressable>
        <Pressable accessibilityRole="link" accessibilityLabel="Política de privacidade" onPress={() => { void Linking.openURL(PRIVACY_URL); }} className="min-h-11 items-center justify-center">
          <Text className="text-xs font-medium text-link underline">Política de privacidade</Text>
        </Pressable>
      </View>
    </Screen>
  );
}
