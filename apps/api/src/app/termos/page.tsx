import type { Metadata } from "next";

export const metadata: Metadata = { title: "Termos de uso — Medicron" };

const UPDATED = "10 de novembro de 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermsPage() {
  const email = process.env.CONTACT_EMAIL?.trim();
  return (
    <main className="mx-auto max-w-2xl px-5 py-10">
      <h1 className="text-2xl font-bold">Termos de uso</h1>
      <p className="mt-1 text-sm text-muted-foreground">Última atualização: {UPDATED}</p>

      <Section title="O que é o Medicron">
        <p>
          O Medicron é um aplicativo para organizar lembretes de medicamentos e cuidados de pessoas e animais de
          estimação, sozinho ou em família. Ao usar o app, você concorda com estes termos e com a{" "}
          <a className="underline" href="/privacidade">Política de privacidade</a>.
        </p>
      </Section>

      <Section title="O que é grátis e o que é Medicron Plus">
        <p>
          O essencial é grátis e continua sendo: receber lembretes, ver a tela Hoje, marcar doses e usar os widgets.
          Nunca cobramos para você receber um lembrete.
        </p>
        <p>
          O plano grátis inclui até 2 pacientes, 2 pessoas na conta e os últimos 30 dias de histórico. O Medicron Plus,
          uma assinatura opcional, inclui pacientes ilimitados, até 8 pessoas na conta e o histórico completo. A
          assinatura é da conta e vale para todas as pessoas dela.
        </p>
        <p>
          Se a assinatura terminar, o que você já cadastrou continua funcionando e recebendo lembretes; só não é
          possível criar novos pacientes ou convidar mais pessoas acima dos limites do plano grátis.
        </p>
      </Section>

      <Section title="Assinatura, cobrança e renovação">
        <p>
          O Medicron Plus é uma assinatura mensal ou anual, cobrada pela App Store ou pelo Google Play (conforme o
          aparelho em que você assinou) e renovada automaticamente no fim de cada período, pelo mesmo preço, até você
          cancelar. Os preços aparecem na tela de assinatura antes da compra, na moeda da loja.
        </p>
        <p>O pagamento é debitado da sua conta da Apple ou do Google na confirmação da compra. Não recebemos nem guardamos os dados do seu cartão.</p>
      </Section>

      <Section title="Teste grátis de 7 dias">
        <p>
          O plano anual pode incluir 7 dias grátis para quem ainda não usou o teste. Cancele pelo menos 24 horas antes
          do fim do teste para não ser cobrado; se não cancelar, a assinatura anual começa e é cobrada ao fim dos 7 dias.
          A tela de assinatura mostra a data da cobrança.
        </p>
      </Section>

      <Section title="Como cancelar">
        <p>
          No iPhone, pelos Ajustes da App Store (Ajustes, seu nome, Assinaturas, Medicron). No Android, pelo Google Play
          (Perfil, Pagamentos e assinaturas, Assinaturas). Também pelo botão &quot;Gerenciar assinatura&quot; na tela Conta do app.
        </p>
        <p>
          O cancelamento vale para o próximo período: você continua com o Plus até o fim do período já pago. Excluir a
          conta não cancela a cobrança da loja: cancele antes pela loja.
        </p>
      </Section>

      <Section title="Reembolsos">
        <p>
          Os reembolsos são tratados pela Apple ou pelo Google, conforme as regras de cada loja, e o pedido é feito a
          elas. Você também pode ter os direitos previstos no Código de Defesa do Consumidor, como o direito de
          arrependimento nas compras feitas pela internet.
        </p>
      </Section>

      <Section title="Não é dispositivo médico">
        <p>
          O Medicron é um organizador de lembretes. Não faz diagnóstico nem indica doses ou tratamentos: siga a
          orientação do seu médico ou veterinário. Os lembretes dependem do aparelho, das notificações ligadas e da
          conexão com a internet; confira sempre o que é importante.
        </p>
      </Section>

      <Section title="Sua conta e seus dados">
        <p>
          Você responde pelas informações que cadastra e por manter a sua senha em segurança. Você pode excluir a
          conta e os seus dados quando quiser, pelo app (Conta, Excluir conta).
        </p>
      </Section>

      <Section title="Mudanças nestes termos">
        <p>
          Se mudarmos algo importante, como preços ou limites, avisamos no app com antecedência. Mudanças de preço valem
          a partir da renovação seguinte, conforme as regras da loja, e atualizamos a data acima.
        </p>
      </Section>

      <Section title="Lei aplicável e contato">
        <p>
          Estes termos seguem a lei brasileira, incluindo o Código de Defesa do Consumidor. Dúvidas ou pedidos:{" "}
          {email ? (
            <>
              escreva para <a className="underline" href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            <>fale conosco pelo próprio app.</>
          )}
        </p>
      </Section>
    </main>
  );
}
