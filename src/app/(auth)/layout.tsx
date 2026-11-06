import { BellRing, HeartPulse, Users } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";

const BENEFITS = [
  { icon: BellRing, text: "Lembretes no celular na hora de cada remédio ou cuidado" },
  { icon: Users, text: "Convide a família para cuidar juntos, na mesma conta" },
  { icon: HeartPulse, text: "Vários gatos, cada um com a sua rotina" },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-gradient-to-br from-primary to-[oklch(0.36_0.08_200)] p-12 text-primary-foreground md:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="bg-white/15 text-white" />
          <span className="text-xl font-semibold tracking-tight">Medicron</span>
        </div>
        <div className="grid gap-8">
          <p className="max-w-md text-3xl leading-tight font-semibold tracking-tight">
            Nenhum remédio esquecido. Todo mundo da casa na mesma página.
          </p>
          <ul className="grid gap-4">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm text-primary-foreground/90">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <Icon aria-hidden className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/70">Controle de medicações e procedimentos dos seus gatos.</p>
      </aside>
      <main className="flex items-center justify-center px-4 py-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
        <div className="grid w-full max-w-sm gap-8">
          <div className="flex flex-col items-center gap-3 text-center md:hidden">
            <BrandMark className="size-14 rounded-2xl [&_svg]:size-7" />
            <p className="text-sm text-muted-foreground">Horários de remédios e cuidados dos seus gatos</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
