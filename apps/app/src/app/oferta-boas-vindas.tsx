import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Linking, Pressable, ScrollView, View } from "react-native";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Check, Gift, X } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorMessage } from "@/lib/api/errors";
import { useMarkWelcomeOfferSeen } from "@/lib/home-queries";
import { useMe } from "@/lib/me-query";
import { getWelcomeOffer, purchase, restore, type WelcomeOffer } from "@/lib/purchases";
import { afterPurchase } from "@/lib/subscription-queries";
import { PRIVACY_URL, TERMS_URL } from "@/components/legal-note";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { toast } from "@/components/ui/toast";
import { useColors } from "@/theme/colors";

/**
 * Oferta de boas-vindas do Plus: o anual com preço de lançamento no 1º ano, exibida UMA vez (a Hoje a abre na primeira vez).
 * Só aparece se a loja realmente a oferece a esta pessoa; do contrário a tela fecha sozinha e a oferta não é gasta.
 * Ao exibir, o servidor grava que ela foi vista: é isso que torna verdadeiro o "não aparece de novo".
 */
export default function OfertaBoasVindas() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
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
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }}>
        <View className="overflow-hidden rounded-b-[34px]">
          <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ alignItems: "center", paddingTop: insets.top + 36, paddingBottom: 56, paddingHorizontal: 24, gap: 8 }}>
            <View className="size-20 items-center justify-center rounded-3xl bg-white shadow-lg" style={{ transform: [{ rotate: "-6deg" }] }}>
              <Icon icon={Gift} color="brandInk" size={42} />
            </View>
            <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-white/90">Oferta de boas-vindas</Text>
            <Text accessibilityRole="header" className="text-center text-3xl font-semibold leading-9 tracking-tight text-white">Seu primeiro ano do Plus com desconto</Text>
          </LinearGradient>
        </View>
        <Pressable
          accessibilityRole="button" accessibilityLabel="Agora não" disabled={busy} onPress={() => router.back()}
          style={{ position: "absolute", right: 16, top: insets.top + 8 }} className="size-11 items-center justify-center rounded-full bg-white/20 active:bg-white/30"
        >
          <Icon icon={X} color="#ffffff" size={20} />
        </Pressable>

        <View style={{ alignSelf: "center", width: "100%", maxWidth: 560, paddingHorizontal: 20, gap: 20 }}>
          <View className="-mt-9 flex-row overflow-hidden rounded-3xl border-2 border-primary bg-card shadow-md">
            <View className="flex-1 items-center justify-center gap-1 bg-muted px-2 py-4">
              <Text className="text-xs font-semibold uppercase text-muted-foreground">Normal</Text>
              <Text style={{ textDecorationLine: "line-through" }} className="text-xl text-muted-foreground">{offer.regularPriceString}</Text>
              <Text className="text-xs text-muted-foreground">por ano</Text>
            </View>
            <View className="flex-[1.25] items-center justify-center gap-0.5 bg-brand-soft px-2 py-4">
              <Text className="text-xs font-extrabold uppercase text-brand-ink">Só no 1º ano</Text>
              <Text className="text-3xl font-extrabold tracking-tight text-brand-ink">{offer.priceString}</Text>
              {offer.savingsPercent ? (
                <View style={{ backgroundColor: "#ffcf4a" }} className="mt-0.5 rounded-full px-2.5 py-0.5">
                  <Text style={{ color: "#4a3300" }} className="text-xs font-extrabold">{`-${offer.savingsPercent}%`}</Text>
                </View>
              ) : null}
            </View>
          </View>

          <View className="gap-3 px-1">
            {["Pacientes ilimitados", "Até 8 pessoas na conta", "Histórico completo"].map((t) => (
              <View key={t} className="flex-row items-center gap-3">
                <View className="size-6 items-center justify-center rounded-full bg-brand-soft">
                  <Icon icon={Check} color="brandInk" size={14} />
                </View>
                <Text className="flex-1 text-base font-medium">{t}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={{ paddingBottom: insets.bottom + 12, paddingHorizontal: 20, paddingTop: 12 }} className="items-center gap-2 border-t border-border bg-background">
        <View style={{ width: "100%", maxWidth: 560 }} className="gap-2">
          {error ? <Text className="text-sm text-destructive">{error}</Text> : null}
          <Text className="text-center text-sm text-muted-foreground">
            {`Depois do primeiro ano, renova por ${offer.regularPriceString}/ano. Cancele quando quiser nos Ajustes da App Store.`}
          </Text>
          <Button size="lg" loading={busy} onPress={() => void buy()} accessibilityLabel={`Quero o Plus por ${offer.priceString}`}>{`Quero o Plus por ${offer.priceString}`}</Button>
          <Text className="text-center text-sm font-semibold">Esta oferta não aparece de novo.</Text>
          <View className="flex-row flex-wrap items-center justify-center gap-x-4">
            <Pressable accessibilityRole="link" accessibilityLabel="Termos de uso" onPress={() => { void Linking.openURL(TERMS_URL); }} className="min-h-11 items-center justify-center">
              <Text className="text-xs font-medium text-link underline">Termos de uso</Text>
            </Pressable>
            <Pressable accessibilityRole="link" accessibilityLabel="Política de privacidade" onPress={() => { void Linking.openURL(PRIVACY_URL); }} className="min-h-11 items-center justify-center">
              <Text className="text-xs font-medium text-link underline">Política de privacidade</Text>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Restaurar compras" disabled={busy} onPress={() => void restorePurchases()} className="min-h-11 items-center justify-center">
              <Text className="text-xs font-medium text-link underline">Restaurar compras</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}
