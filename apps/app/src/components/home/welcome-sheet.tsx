import { useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Bell, CalendarClock, Check, HeartPulse, type LucideIcon } from "lucide-react-native";
import { cn } from "@/lib/cn";
import { useCompleteWelcome } from "@/lib/home-queries";
import { useColors } from "@/theme/colors";
import { Button } from "@/components/ui/button";
import { Drawer } from "@/components/ui/drawer";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";

const SLIDES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Bell, title: "Bem-vindo ao Medicron", text: "Acompanhe os horários de medicação e cuidados de quem você cuida, tudo em um só lugar, com lembretes no celular." },
  { icon: HeartPulse, title: "Cadastre pacientes e itens", text: "Pacientes podem ser gatos, cachorros, pessoas… Itens são as medicações e os procedimentos que entram nas rotinas." },
  { icon: CalendarClock, title: "Monte a rotina", text: "Associe um item a um paciente e defina a frequência. Se uma dose atrasar, dá para reprogramar os próximos horários." },
  { icon: Check, title: "Marque como feito", text: "Na tela Hoje, toque em Feito ou Pular. Resolva tudo no dia para fechar o dia e manter a sequência." },
];

const SWIPE = 50;

/** Boas-vindas na primeira vez: 4 slides em um sheet. Concluir, Pular ou fechar registram que o usuário já viu (uma vez). */
export function WelcomeSheet() {
  const colors = useColors();
  const complete = useCompleteWelcome();
  const [open, setOpen] = useState(true);
  const [i, setI] = useState(0);
  const touchX = useRef<number | null>(null);
  const finished = useRef(false);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  function finish() {
    setOpen(false);
    if (finished.current) return;
    finished.current = true;
    complete.mutate();
  }
  const go = (n: number) => setI(Math.min(SLIDES.length - 1, Math.max(0, n)));

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <View
        testID="welcome-slide"
        className="items-center gap-3 px-2 pb-2 pt-6"
        onTouchStart={(e) => { touchX.current = e.nativeEvent.pageX; }}
        onTouchEnd={(e) => {
          if (touchX.current === null) return;
          const dx = e.nativeEvent.pageX - touchX.current;
          touchX.current = null;
          if (Math.abs(dx) > SWIPE) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <View className="size-16 overflow-hidden rounded-2xl shadow-sm">
          <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Icon icon={slide.icon} color="#ffffff" size={32} />
          </LinearGradient>
        </View>
        <Text accessibilityRole="header" className="text-center text-xl font-semibold">{slide.title}</Text>
        <Text className="max-w-sm text-center text-base text-muted-foreground">{slide.text}</Text>
        <View role="group" accessibilityLabel={`Passo ${i + 1} de ${SLIDES.length}`} className="flex-row gap-2">
          {SLIDES.map((s, k) => (
            <Pressable key={s.title} accessibilityRole="button" accessibilityLabel={`Ir para o passo ${k + 1}`} onPress={() => go(k)} className="size-6 items-center justify-center">
              <View className={cn("size-2 rounded-full", k === i ? "bg-primary" : "bg-dot-off")} />
            </Pressable>
          ))}
        </View>
        <View className="mt-1 w-full max-w-sm flex-row gap-2">
          {last ? (
            <Button variant="ghost" size="lg" onPress={() => go(i - 1)}>Voltar</Button>
          ) : (
            <Button variant="ghost" size="lg" onPress={finish}>Pular</Button>
          )}
          {last ? (
            <Button size="lg" className="flex-1" onPress={finish}>Concluir e começar</Button>
          ) : (
            <Button size="lg" className="flex-1" onPress={() => go(i + 1)}>Próximo</Button>
          )}
        </View>
      </View>
    </Drawer>
  );
}
