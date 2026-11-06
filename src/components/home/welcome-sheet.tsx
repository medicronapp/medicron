"use client";
import { useState, useTransition } from "react";
import { Bell, CalendarClock, Check, HeartPulse, type LucideIcon } from "lucide-react";
import { completeWelcomeAction } from "@/app/(app)/actions";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerDescription, DrawerTitle } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const SLIDES: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Bell, title: "Bem-vindo ao Medicron", text: "Acompanhe os horários de medicação e cuidados de quem você cuida, tudo em um só lugar, com lembretes no celular." },
  { icon: HeartPulse, title: "Cadastre pacientes e itens", text: "Pacientes podem ser gatos, cachorros, pessoas… Itens são as medicações e os procedimentos que entram nas rotinas." },
  { icon: CalendarClock, title: "Monte a rotina", text: "Associe um item a um paciente e defina a frequência. Se uma dose atrasar, dá para reprogramar os próximos horários." },
  { icon: Check, title: "Marque como feito", text: "Na tela Hoje, toque em Feito ou Pular. Resolva tudo no dia para fechar o dia e manter a sequência." },
];

/** Boas-vindas na primeira vez: 4 slides em um sheet. Concluir, Pular ou fechar registram que o usuário já viu. */
export function WelcomeSheet() {
  const [open, setOpen] = useState(true);
  const [i, setI] = useState(0);
  const [touchX, setTouchX] = useState<number | null>(null);
  const [, start] = useTransition();
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];
  const Icon = slide.icon;

  function finish() {
    setOpen(false);
    start(async () => { await completeWelcomeAction(); });
  }
  const go = (n: number) => setI(Math.min(SLIDES.length - 1, Math.max(0, n)));

  return (
    <Drawer open={open} onOpenChange={(o) => { if (!o) finish(); }}>
      <DrawerContent>
        <div
          className="grid justify-items-center gap-3 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-2 text-center"
          onTouchStart={(e) => setTouchX(e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (touchX === null) return;
            const dx = e.changedTouches[0].clientX - touchX;
            if (Math.abs(dx) > 50) go(i + (dx < 0 ? 1 : -1));
            setTouchX(null);
          }}
        >
          <span className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-hero-from to-hero-to text-white shadow-sm">
            <Icon aria-hidden className="size-8" />
          </span>
          <DrawerTitle className="text-xl">{slide.title}</DrawerTitle>
          <DrawerDescription className="max-w-sm text-base">{slide.text}</DrawerDescription>
          <div className="flex gap-2" aria-label={`Passo ${i + 1} de ${SLIDES.length}`} role="group">
            {SLIDES.map((s, k) => (
              <button
                key={s.title} type="button" aria-label={`Ir para o passo ${k + 1}`} onClick={() => go(k)}
                className="flex size-6 items-center justify-center"
              >
                <span className={cn("size-2 rounded-full transition-colors", k === i ? "bg-primary" : "bg-muted-foreground/30")} />
              </button>
            ))}
          </div>
          <div className="mt-1 grid w-full max-w-sm grid-cols-[auto_1fr] gap-2">
            {last ? (
              <Button variant="ghost" size="lg" onClick={() => go(i - 1)}>Voltar</Button>
            ) : (
              <Button variant="ghost" size="lg" onClick={finish}>Pular</Button>
            )}
            {last ? (
              <Button size="lg" onClick={finish}>Concluir e começar</Button>
            ) : (
              <Button size="lg" onClick={() => go(i + 1)}>Próximo</Button>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
