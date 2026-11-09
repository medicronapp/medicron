import { KeyboardAvoidingView, Platform, ScrollView, View } from "react-native";
import { BellRing, HeartPulse, Users } from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BrandMark } from "@/components/brand-mark";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useIsWide } from "@/lib/use-breakpoint";

const BENEFITS = [
  { icon: BellRing, text: "Lembretes no celular na hora de cada remédio ou cuidado" },
  { icon: Users, text: "Convide a família para cuidar juntos, na mesma conta" },
  { icon: HeartPulse, text: "Vários pacientes, cada um com a sua rotina" },
];

/** Moldura das telas de acesso: painel verde à esquerda em telas largas; no celular, marca e frase acima do formulário. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const wide = useIsWide();
  const insets = useSafeAreaInsets();
  return (
    <View className="flex-1 flex-row bg-background">
      {wide ? (
        <View className="flex-1 justify-between bg-linear-to-br from-hero-from to-hero-to p-12">
          <View className="flex-row items-center gap-3">
            <BrandMark className="bg-white/15" ringColor="#ffffff" />
            <Text className="text-xl font-semibold tracking-tight text-white">Medicron</Text>
          </View>
          <View className="gap-8">
            <Text className="max-w-md text-3xl font-semibold leading-tight tracking-tight text-white">
              Nenhum remédio esquecido. Todo mundo da casa na mesma página.
            </Text>
            <View className="gap-4">
              {BENEFITS.map(({ icon, text }) => (
                <View key={text} className="flex-row items-center gap-3">
                  <View className="size-9 items-center justify-center rounded-full bg-white/15">
                    <Icon icon={icon} color="heroAccent" size={16} />
                  </View>
                  <Text className="flex-1 text-sm text-white/90">{text}</Text>
                </View>
              ))}
            </View>
          </View>
          <Text className="text-xs text-white/70">Controle de medicações e procedimentos de quem você cuida.</Text>
        </View>
      ) : null}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1">
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ flexGrow: 1, justifyContent: "center", paddingHorizontal: 16, paddingTop: Math.max(40, insets.top), paddingBottom: 40 }}
        >
          <View className="mx-auto w-full max-w-sm gap-8">
            {wide ? null : (
              <View className="items-center gap-3">
                <View accessibilityLabel="Logo do Medicron" className="flex-row items-center gap-3">
                  <BrandMark className="size-14 rounded-2xl" size={28} />
                  <Text className="text-3xl font-semibold tracking-tight">Medicron</Text>
                </View>
                <Text className="text-center text-sm text-muted-foreground">Horários de remédios e cuidados de quem você cuida</Text>
              </View>
            )}
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
