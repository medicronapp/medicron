import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage } from "@/lib/api/errors";
import { useMarkWelcomeOfferSeen } from "@/lib/home-queries";
import { useMe } from "@/lib/me-query";
import { getWelcomeOffer, purchase, restore, type WelcomeOffer } from "@/lib/purchases";
import { afterPurchase } from "@/lib/subscription-queries";
import { PRIVACY_URL, TERMS_URL } from "@/components/legal-note";
import { PlusBenefits } from "@/components/plus-benefits";
import { PlusHero } from "@/components/plus-hero";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";

/**
 * Oferta de boas-vindas do Plus: o anual com preço de lançamento no 1º ano, exibida UMA vez (a Hoje a abre na primeira vez).
 * Só aparece se a loja realmente a oferece a esta pessoa; do contrário a tela fecha sozinha e a oferta não é gasta.
 * Ao exibir, o servidor grava que ela foi vista: é isso que torna verdadeiro o "não aparece de novo".
 */
export default function OfertaBoasVindas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const orgId = useMe().data?.orgId;
  const markSeen = useMarkWelcomeOfferSeen();
  const [offer, setOffer] = useState<WelcomeOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const marked = useRef(false);

  useEffect(() => {
    let alive = true;
    getWelcomeOffer().then(
      (o) => { if (!alive) return; if (o) setOffer(o); else router.back(); },
      () => { if (alive) router.back(); }, // sem rede: fecha sem gastar a oferta
    );
    return () => { alive = false; };
  }, [router]);

  useEffect(() => {
    if (offer && !marked.current) {
      marked.current = true;
      markSeen.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à oferta aparecer; `markSeen` muda a cada render
  }, [offer]);

  async function buy() {
    if (!offer || !orgId || busy) return;
    setBusy(true);
    setError("");
    try {
      if ((await purchase(offer.pkg, orgId)) === "purchased") {
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
        router.back();
      } else {
        toast.info("Nenhuma assinatura encontrada para restaurar.");
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  if (!offer) {
    return (
      <View accessibilityLabel="Carregando oferta" aria-busy className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerStyle={{ alignItems: "center", padding: 16, paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }}>
      <View style={{ width: "100%", maxWidth: 560, gap: 20 }}>
        <PlusHero eyebrow="Oferta de boas-vindas" title={`Seu primeiro ano do Plus por ${offer.priceString}`} subtitle="Um convite só para quem está começando agora." />

        <View className="items-center gap-1 rounded-3xl border border-primary bg-brand-soft p-5">
          {offer.savingsPercent ? (
            <View className="mb-1 rounded-full bg-primary px-3 py-1">
              <Text className="text-xs font-semibold text-primary-foreground">{`Economize ${offer.savingsPercent}%`}</Text>
            </View>
          ) : null}
          <Text style={{ textDecorationLine: "line-through" }} className="text-lg text-muted-foreground">{offer.regularPriceString}</Text>
          <Text className="text-5xl font-semibold tracking-tight">{offer.priceString}</Text>
          <Text className="text-base text-muted-foreground">no primeiro ano</Text>
        </View>

        <PlusBenefits />

        <View className="gap-3">
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <Button size="lg" loading={busy} onPress={() => void buy()} accessibilityLabel={`Quero o Plus por ${offer.priceString}`}>{`Quero o Plus por ${offer.priceString}`}</Button>
          <Button variant="ghost" size="lg" disabled={busy} onPress={() => router.back()} accessibilityLabel="Agora não">Agora não</Button>
          <Text className="text-center text-sm font-medium">Esta oferta não aparece de novo.</Text>
          <Text className="text-center text-xs text-muted-foreground">
            {`Depois do primeiro ano, renova por ${offer.regularPriceString}/ano. Cancele quando quiser nos Ajustes da App Store.`}
          </Text>
        </View>

        <View className="items-center">
          <Button variant="ghost" size="lg" disabled={busy} onPress={() => void restorePurchases()} accessibilityLabel="Restaurar compras">Restaurar compras</Button>
          <View className="flex-row justify-center gap-6">
            <Pressable accessibilityRole="link" accessibilityLabel="Termos de uso" onPress={() => { void Linking.openURL(TERMS_URL); }} className="min-h-11 items-center justify-center">
              <Text className="text-xs font-medium text-link underline">Termos de uso</Text>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="Política de privacidade" onPress={() => { void Linking.openURL(PRIVACY_URL); }} className="min-h-11 items-center justify-center">
              <Text className="text-xs font-medium text-link underline">Política de privacidade</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
