# Home com visão de completude — desenho

Data: 2026-11-04. Autor do pedido: Thiago (dono do app). Idioma da interface: português do Brasil.
Mockups aprovados: `.superpowers/brainstorm/96504-1793841766/content/home-mistura.html` e `home-abas.html`.

## Intenção e por quê

Hoje a home do Medicron mostra o que está atrasado, o que vem a seguir e uma lista "Últimos registros". O dono
descreveu o problema assim: ele pode ter **perdido uma medicação** e, para saber, precisa olhar a lista de últimos
registros e **calcular de cabeça** se o último foi mesmo o último que deveria ter sido aplicado. A lista só mostra o
que foi marcado; uma dose que passou sem ninguém marcar não aparece em lugar nenhum além de um alerta de "atrasada".

O objetivo é abrir a home e **saber de relance, sem calcular, se o dia está completo**, e sentir isso (um toque de
gamificação: sequência de dias em dia, progresso do dia, a semana em quadradinhos).

## Vocabulário

- **Cuidado**: um horário esperado de uma rotina (plano) em um dia. Ex.: Amoxicilina da Izzy às 14:00.
- **Dia**: dia do calendário em Brasília (`America/Sao_Paulo`), 00:00 a 23:59.
- **Resolvido**: um cuidado com registro de "feito" ou "pulado".
- **Sem registro**: o horário passou (mais de 15 minutos, como já é hoje para "atrasada") e não há registro.
- **Dia em dia**: todos os cuidados esperados do dia estão resolvidos até o fim do dia seguinte (janela de solução).
- **Janela de solução**: até 23:59 do dia seguinte ao do cuidado.

## Objetivos

1. A home mostra, para cada gato, **todos os cuidados esperados hoje**, na ordem do horário, cada um num estado:
   Feito, Pulado, Sem registro, Agora, Mais tarde. Nada que deveria ter acontecido fica invisível.
2. Dá para **resolver** um cuidado sem registro dali mesmo: "Foi feita" ou "Pular" (também para horários de antes de
   hoje, dentro da janela de solução).
3. Uma **faixa de sequência** no topo: "N dias seguidos em dia", progresso do dia (resolvidos/esperados), a semana
   em quadradinhos coloridos.
4. A seção de atenção (atrasadas e "agora", com botões Feito/Pular) continua no alto, como hoje.

## Não-objetivos

- Pontos, medalhas, ranking entre pessoas, loja de recompensas.
- Notificação push para dose sem registro (os lembretes atuais não mudam).
- Editar ou apagar registros já feitos; escolher a hora exata em que a dose foi dada (o registro tardio grava o
  momento em que foi registrado e é marcado "registrada depois").
- Sequência por gato, estatísticas por pessoa, histórico de meses anteriores, recalcular o passado antes do lançamento.

## Anti-objetivos (seria falha mesmo que funcione tecnicamente)

- Mostrar o dia como "em dia"/verde enquanto existe qualquer cuidado sem registro.
- Punir a pessoa por esquecer de tocar: quem deu o remédio e registra no dia seguinte deve conseguir consertar o dia.
- Mudar o comportamento atual dos lembretes ou do botão Feito/Pular dos cartões.
- Perder ou alterar os dados reais já em produção (2 pessoas usam o app agora).

## Decisões do dono (valem como estão)

- Layout da home, de cima para baixo: (1) faixa de sequência; (2) "Precisa de atenção" (atrasadas e agora);
  (3) "Linha do dia". A linha do dia **substitui** "Próximas 24 horas" e "Últimos registros".
- A linha do dia tem **abas, uma por gato**, para não crescer na vertical.
- **Pulado conta como em dia.** O que quebra a sequência é cuidado **sem registro e sem solução**.
- **Resolver depois conserta a sequência, até o fim do dia seguinte.** Depois da janela, ainda dá para resolver (o
  histórico fica verdadeiro, registrado como "registrada depois"), mas o dia continua marcado como perdido e a
  sequência não volta. Na tela: dia consertado em verde; dia perdido em âmbar com a nota "dose sem solução".

## Decisões minhas (o dono pode rever)

- Abas: cada uma mostra o nome do gato e um sinal (bolinha vermelha com o número de cuidados sem registro; ou
  progresso "1 de 2"). Ao abrir a home, a aba selecionada é a do gato com cuidado sem registro mais antigo; sem
  pendência, a primeira da lista. A faixa de sequência soma todos os gatos.
- Dia sem nenhum cuidado esperado não conta e não quebra a sequência.
- Uma rotina nova só passa a esperar cuidados **a partir do momento em que foi criada** (e do horário âncora), para
  não nascer com dose perdida no passado. Rotina encerrada ou arquivada deixa de esperar cuidados dali em diante.
- A sequência só conta **dias a partir do lançamento** desta funcionalidade; não se reconstrói o passado.
- O dia de hoje conta na sequência quando fica "fechado": todos os cuidados do dia (inclusive os de mais tarde)
  resolvidos. Enquanto o dia anterior está pendente dentro da janela, a faixa avisa "ontem tem 1 dose sem registro:
  resolva até hoje 23:59 para manter a sequência" e a sequência é mostrada como "em risco".
- Semana na faixa: segunda a domingo, dia de hoje destacado; dias futuros vazios.
- Ao fechar o dia: mensagem curta de celebração na faixa ("Dia fechado!"); sem animação pesada.
- Qualquer membro da conta pode resolver um cuidado; o registro guarda quem resolveu.
- **Feito/Pular num cartão registra só aquele horário.** Nenhum outro horário é pulado ou perdido por causa disso
  (hoje, registrar uma dose atrasada empurra a rotina para depois de agora e deixa os horários intermediários sem
  registro; isso passa a ser corrigido, porque fabricava "doses perdidas" que ninguém perdeu). O que "próximo
  horário" significa no banco pode mudar à vontade, desde que cada horário gere um único lembrete e os lembretes
  atuais continuem chegando como hoje.
- **"Precisa de atenção" lista todo cuidado sem registro dentro da janela de solução** (hoje e ontem), do mais antigo
  para o mais novo, mais os que estão "agora". Com mais de 5 pendências, mostra as 5 mais antigas e "Ver todas (N)".
- **Dias anteriores:** os quadradinhos da semana na faixa são tocáveis e abrem a linha daquele dia, onde também dá para
  resolver ("registrada depois"). Dias fora da semana exibida não ficam acessíveis nesta primeira versão.
- **O dia é o dia do calendário (00:00–23:59).** O "00:30 · mais tarde" do mockup era ilustrativo e estava errado:
  um cuidado de 00:30 pertence ao dia seguinte e aparece lá.
- **Sem registro adiantado (padrão, o dono pode virar):** cuidados de "mais tarde" não têm botões; só dá para resolver
  o que está "agora" ou já passou. Consequência: o dia só fecha, e a celebração só aparece, quando o último cuidado do
  dia é resolvido.
- Cores e ícones de status como no mockup (feito verde, pulado cinza, sem registro vermelho, agora âmbar, mais
  tarde cinza claro) e sempre com ícone + texto, nunca só cor. Respeita claro/escuro já existentes.

## Restrições do sistema atual

- Stack: Next.js 16 (App Router), Drizzle + Postgres (Neon), Better Auth (organizações), Tailwind 4 + shadcn/ui.
  Testes com Vitest (serviços testados contra PGlite em memória). Plano gratuito da Vercel: não há cron por minuto
  da plataforma; o disparo de lembretes é um agendador externo chamando `/api/cron/dispatch` a cada minuto.
- Hoje cada rotina (`care_plans`) guarda só o **próximo horário** (`next_due_at`); ao registrar uma dose, o próximo
  horário avança para o primeiro slot **depois de agora** e os slots intermediários **nunca ganham registro**. Ou
  seja: o app **não guarda** que um cuidado ficou sem registro; hoje isso só se deduz comparando com a rotina.
- Rotinas podem ser editadas (frequência, âncora, data final) e encerradas; o passado não pode ser recalculado a
  partir da rotina atual sem dar resultado errado.
- O botão Feito/Pular de hoje só aceita o horário que está em `next_due_at` e, ao registrar, pula tudo até depois de
  agora. Para resolver horários isolados, quem constrói pode redefinir o papel de `next_due_at` (ver decisões minhas).
- `dose_logs` tem restrição única (rotina, horário) e já registra feito/pulado, quem, quando, valor e observação.
- Fuso: instantes em UTC no banco, dia e horários exibidos em Brasília (sem horário de verão).

## O que fica para quem constrói

- Modelo de dados e como obter "o que era esperado em cada dia". Recomendação: **materializar** os cuidados
  esperados (um registro por rotina e horário, gerado a partir da rotina e preenchido ao registrar), de modo que
  edição de rotina só afeta cuidados futuros e dias passados ficam congelados após a janela de solução.
- Como fechar/congelar um dia (sob demanda ao ler a home ou por tarefa agendada) e como calcular a sequência.
- Marcar um registro como "registrada depois" (ex.: coluna nova) e como resolver um horário passado **sem mexer no
  próximo horário** da rotina nem nos lembretes.
- Migração segura dos dados existentes (rotinas ativas e o registro atual em produção).
- Forma da API/Server Actions, componentes e ordem de implementação. Testes de serviço contra PGlite como hoje.

## Exemplos de aceitação

1. Izzy tem Amoxicilina a cada 6 h a partir das 08:00 e ninguém registra a das 14:00; às 20:00 a aba da Izzy mostra
   08:00 Feito, 14:00 Sem registro (com "Resolver"), 20:00 Agora; a aba tem bolinha vermelha "1"; o dia não está
   fechado.
2. Tocar em "Foi feita" na dose das 14:00 marca só aquele horário como feito (registrado por quem tocou); a dose das
   20:00 continua pendente e seu lembrete continua valendo; o contador do dia sobe.
3. Dose pulada de propósito conta como resolvida: se todas as outras estão resolvidas, o dia fecha e a sequência
   sobe.
4. Ontem terminou com 1 dose sem registro. Hoje às 10:00 a pessoa resolve; ontem passa a "em dia" (verde) e a
   sequência é preservada. Se resolver só depois de 23:59 de hoje: o registro entra como "registrada depois", ontem
   continua âmbar "dose sem solução" e a sequência recomeça.
5. Rotina criada às 15:00 com âncora às 08:00 não gera cuidado sem registro para 08:00 e 14:00 de hoje.
6. Editar a frequência de uma rotina às 11:00 não altera os cuidados já passados nem os já resolvidos de hoje.
7. Conta com dois gatos: duas abas; a faixa de sequência considera os dois; um cuidado sem registro em qualquer um
   impede o dia de fechar.
8. Dia sem cuidados esperados não aparece como falha e não zera a sequência.
