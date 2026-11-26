import { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, ScrollView, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Check, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
import { Icon } from "@/components/ui/icon";
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

/** "Ao continuar, você concorda com os Termos de uso e a Política de privacidade.": uma frase, com os links dentro do texto. */
function LegalLine() {
  return (
    <Text className="text-center text-xs text-muted-foreground">
      {"Ao continuar, você concorda com os "}
      <Text accessibilityRole="link" accessibilityLabel="Termos de uso" onPress={() => { void Linking.openURL(TERMS_URL); }} className="text-xs text-muted-foreground underline">Termos de uso</Text>
      {" e a "}
      <Text accessibilityRole="link" accessibilityLabel="Política de privacidade" onPress={() => { void Linking.openURL(PRIVACY_URL); }} className="text-xs text-muted-foreground underline">Política de privacidade</Text>
      {"."}
    </Text>
  );
}

type PlanCardProps = {
  on: boolean; onPress: () => void; label: string; title: string; sub?: string | null; note?: string | null;
  price: string; per: string; ribbon?: string | null;
};

/** Cartão de plano com botão de escolha (radio): o escolhido fica com o círculo preenchido, borda grossa e fundo verde claro. */
function PlanCard({ on, onPress, label, title, sub, note, price, per, ribbon }: PlanCardProps) {
  return (
    <Pressable
      accessibilityRole="radio" accessibilityLabel={label} accessibilityState={{ checked: on }} onPress={onPress}
      className={cn("flex-row items-center gap-3.5 rounded-[18px] bg-card p-4", on ? "border-[2.5px] border-primary bg-brand-soft" : "border-[1.5px] border-border")}
    >
      {ribbon ? (
        <View style={{ position: "absolute", top: -11, left: 48, backgroundColor: "#ffcf4a" }} className="rounded-full px-2.5 py-1">
          <Text style={{ color: "#4a3300" }} className="text-[11px] font-extrabold uppercase tracking-wide">{ribbon}</Text>
        </View>
      ) : null}
      <View className={cn("size-[26px] items-center justify-center rounded-full border-2", on ? "border-primary bg-primary" : "border-border bg-card")}>
        {on ? <Icon icon={Check} color="#ffffff" size={15} /> : null}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-[17px] font-bold">{title}</Text>
        {sub ? <Text className="text-[13px] text-muted-foreground">{sub}</Text> : null}
        {note ? <Text className="mt-1 text-[12.5px] font-bold text-brand-ink">{note}</Text> : null}
      </View>
      <View className="items-end">
        <Text className="text-[22px] font-extrabold tracking-tight">{price}</Text>
        <Text className="text-xs text-muted-foreground">{per}</Text>
      </View>
    </Pressable>
  );
}

/** Paywall do Medicron Plus. Preços e teste grátis vêm da loja (nada fixo no código). O essencial continua grátis. */
export default function Plus() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
  const buyLabel = trial ? `Começar ${trial.days} dias grátis` : pkg ? `Assinar por ${pkg.priceString}/${pkg.period === "year" ? "ano" : "mês"}` : "Assinar";
  const chargeDay = trial ? formatDay(new Date(Date.now() + trial.days * 86_400_000).toISOString()) : null;

  const close = () => router.back();

  // Conta que já é Plus: nada a vender, só o estado e o atalho para gerenciar a assinatura.
  if (isPlus && subscription) {
    return (
      <Screen>
        <PageHeader title="Medicron Plus" onBack={close} />
        <PlusBenefits />
        <View className="gap-3">
          <Text className="text-base font-semibold">{`Medicron Plus ativo até ${formatDay(subscription.plusUntil!)}`}</Text>
          {subscription.source === "manual" ? (
            <Text className="text-sm text-muted-foreground">Concedido pela equipe do Medicron.</Text>
          ) : (
            <Button variant="outline" size="lg" accessibilityLabel="Gerenciar assinatura" onPress={() => { void Linking.openURL(manageUrl()); }}>Gerenciar assinatura</Button>
          )}
        </View>
        <Text className="text-sm text-muted-foreground">Continuam grátis: lembretes, a tela Hoje, marcar doses e widgets.</Text>
        <LegalLine />
      </Screen>
    );
  }

  const ready = canBuy && !!offer && offerState === "idle";

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <PlusHero
          topInset={insets.top}
          title={HERO_TITLE[motivo ?? ""] ?? DEFAULT_TITLE}
          subtitle={reason ?? "Sem limites para quem cuida de muita gente."}
        />
        <View style={{ alignSelf: "center", width: "100%", maxWidth: 560, paddingHorizontal: 20, paddingTop: 18, gap: 16 }}>
          {!role ? null : !isAdmin ? (
            <Text className="text-base text-muted-foreground">Peça a quem administra a conta para assinar.</Text>
          ) : Platform.OS === "web" && !previewPaywall ? (
            <Text className="text-base text-muted-foreground">Assine pelo aplicativo no celular.</Text>
          ) : !purchasesAvailable ? (
            <Text className="text-base text-muted-foreground">A assinatura não está disponível neste momento.</Text>
          ) : offerState === "loading" || (offerState === "idle" && !offer) ? (
            <View accessibilityLabel="Carregando planos" aria-busy className="gap-3.5">
              <Skeleton className="h-24 w-full rounded-[18px]" />
              <Skeleton className="h-20 w-full rounded-[18px]" />
            </View>
          ) : offerState === "error" || !offer ? (
            <View className="gap-3">
              <Text className="text-base text-muted-foreground">Não foi possível carregar os planos.</Text>
              <Button variant="outline" size="lg" onPress={load} accessibilityLabel="Tentar de novo">Tentar de novo</Button>
            </View>
          ) : (
            <View className="gap-3.5 pt-2">
              <PlanCard
                on={choice === "annual"} onPress={() => setChoice("annual")}
                label={`${offer.annual.priceString} por ano`} title="Anual"
                sub={offer.annual.pricePerMonthString ? `${offer.annual.pricePerMonthString} por mês` : null}
                note={choice === "annual" && offer.annual.trial ? `Comece com ${offer.annual.trial.days} dias grátis` : null}
                price={offer.annual.priceString} per="por ano"
                ribbon={savings !== null && savings >= MIN_SAVINGS ? `Melhor valor · Economize ${savings}%` : "Melhor valor"}
              />
              <PlanCard
                on={choice === "monthly"} onPress={() => setChoice("monthly")}
                label={`${offer.monthly.priceString} por mês`} title="Mensal" sub="Cobrado todo mês"
                price={offer.monthly.priceString} per="por mês"
              />
            </View>
          )}

          <PlusBenefits plain />
          <Text className="text-center text-sm text-muted-foreground">Continuam grátis: lembretes, a tela Hoje, marcar doses e widgets.</Text>
          {ready ? null : <LegalLine />}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button" accessibilityLabel="Fechar" onPress={close}
        style={{ position: "absolute", right: 16, top: insets.top + 8 }} className="size-11 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
      >
        <Icon icon={X} color="#ffffff" size={20} />
      </Pressable>

      {ready && pkg ? (
        <View style={{ paddingBottom: insets.bottom + 12, paddingHorizontal: 20, paddingTop: 12 }} className="items-center border-t border-border bg-background">
          <View style={{ width: "100%", maxWidth: 560 }} className="gap-2">
            {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
            <Text className="text-center text-[13px] text-muted-foreground">{terms}</Text>
            {chargeDay ? <Text className="text-center text-[13px] text-muted-foreground">{`A cobrança acontece em ${chargeDay}, se você não cancelar antes.`}</Text> : null}
            <Button size="lg" loading={busy} onPress={() => void buy()} accessibilityLabel={buyLabel}>{buyLabel}</Button>
            <Button variant="ghost" size="lg" disabled={busy} onPress={() => void restorePurchases()} accessibilityLabel="Restaurar compras">Restaurar compras</Button>
            <LegalLine />
          </View>
        </View>
      ) : null}
    </View>
  );
}
