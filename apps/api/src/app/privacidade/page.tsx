import type { Metadata } from "next";

export const metadata: Metadata = { title: "Política de privacidade — Medicron" };

const UPDATED = "8 de novembro de 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  const email = process.env.CONTACT_EMAIL?.trim();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold">Política de privacidade</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última atualização: {UPDATED}</p>

      <Section title="Quem somos">
        <p>
          O Medicron é um aplicativo para organizar lembretes de medicamentos e cuidados de pessoas e animais de
          estimação, sozinho ou em conjunto com a família. Esta política explica quais dados tratamos e por quê.
        </p>
      </Section>

      <Section title="Que dados coletamos e para quê">
        <ul className="list-disc space-y-1 pl-5">
          <li>Nome e e-mail e senha (guardada apenas como um hash, protegida de forma irreversível), para criar e proteger a sua conta.</li>
          <li>
            Dados que você cadastra: pacientes (pessoas ou animais), medicamentos e itens de cuidado, rotinas, horários
            e o registro de doses dadas, para mostrar a agenda e enviar os lembretes.
          </li>
          <li>Token de notificação do aparelho, para entregar os lembretes no celular ou no navegador.</li>
          <li>Um cookie de sessão no navegador (ou um token seguro no app), para manter você conectado.</li>
        </ul>
        <p>Não usamos publicidade, não montamos perfis e não vendemos os seus dados.</p>
      </Section>

      <Section title="Com quem compartilhamos">
        <p>
          Apenas com quem faz o serviço funcionar: a Vercel (hospedagem), a Neon (banco de dados) e a Expo (envio das
          notificações push no celular) e, no navegador, os serviços de push dos navegadores (Apple, Google, Mozilla). Pessoas que você convidar para a sua conta veem os dados dela. Não compartilhamos dados
          com anunciantes.
        </p>
      </Section>

      <Section title="Por quanto tempo guardamos">
        <p>Guardamos os dados enquanto a sua conta existir. Ao excluir a conta, eles são apagados.</p>
      </Section>

      <Section title="Como excluir seus dados">
        <p>
          No app, abra Conta → Excluir conta e confirme com a sua senha. Isso apaga o seu acesso e os seus dados; se
          você for a única pessoa da conta, os pacientes, itens e rotinas dela também são apagados. Não dá para
          desfazer.
        </p>
      </Section>

      <Section title="Seus direitos">
        <p>
          Conforme a LGPD (Lei 13.709/2018), você pode pedir acesso, correção ou exclusão dos seus dados e tirar o
          consentimento quando quiser.{" "}
          {email ? (
            <>
              Escreva para <a className="underline" href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            <>Você pode fazer isso pelo próprio app.</>
          )}
        </p>
      </Section>

      <Section title="Crianças e menores">
        <p>
          O app é voltado a adultos que cuidam de si e de outras pessoas. Os dados de crianças são cadastrados por
          quem as acompanha, que responde por eles.
        </p>
      </Section>

      <Section title="Mudanças nesta política">
        <p>Se mudarmos algo importante, atualizamos a data acima.</p>
      </Section>
    </main>
  );
}
