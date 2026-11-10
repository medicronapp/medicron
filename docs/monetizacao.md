# Monetização do Medicron: plano de negócio (proposta)

Documento de estratégia, **não** de implementação: nada aqui foi construído. Serve para você decidir o modelo, os preços e a ordem das coisas antes de abrir o código. Data da pesquisa: 10/11/2026. Os números de comissão e de concorrentes mudaram bastante em 2026 e **as fontes se contradizem em alguns pontos**; onde isso importa, o texto avisa e diz o que conferir.

---

## 1. Resumo (a recomendação em 10 linhas)

1. **Modelo: freemium com assinatura** (`Medicron Plus`), cobrada **por conta** (a família inteira se beneficia), não por pessoa.
2. **Regra de ouro (inegociável):** lembretes e o registro de doses são **gratuitos para sempre**. Nunca cobrar para a pessoa ser avisada do remédio. É ético, protege a reputação e reduz o risco de reprovação e de avaliações ruins (a Medisafe recebeu muitas críticas, segundo relatos de terceiros, ao apertar o grátis em 2026).
3. **Iscas e limites** ficam em **escala** (mais pacientes, mais pessoas na conta, histórico longo, relatório para o médico ou veterinário) e em **conforto** (alertar a família quando uma dose atrasa, controle de estoque), não na segurança básica.
4. **Preço sugerido para começar:** **R$ 12,90 por mês** e **R$ 89,90 por ano** (equivale a R$ 7,49/mês; desconto de 42%). Destacar o anual.
5. **Isca principal:** **7 dias grátis da loja** (oferta introdutória da Apple e do Google, com cartão), no plano anual. Quem não assina continua no grátis **sem perder dados nem parar lembretes já configurados**.
6. **Apple:** sim, **assinatura renovável automática pela App Store** (é obrigatória para destravar recursos digitais dentro do app iOS), operada por **RevenueCat** (grátis até US$ 2.500 de receita mensal), com o **servidor da API como fonte da verdade** dos limites.
7. **Google Play:** a mesma assinatura via Play Billing (também pelo RevenueCat).
8. **Web/Pix:** fica para a fase 2 (cobrança fora das lojas, com taxa muito menor). No iOS, as regras novas do Brasil (2026) permitem link para pagamento externo, com comissão; avaliar depois.
9. **Lançar já com as regras definitivas** (limites e Plus à venda), e não "tudo liberado, cobrar depois": ligar a cobrança em quem já usa sem limites **pega mal**. Como o app ainda não está nas lojas, nada precisa ser tirado de ninguém. Os limites só podem **afrouxar** depois, nunca apertar (seção 9).
10. **Expectativa honesta:** é um nicho. O cenário base (10 mil contas ativas, 3% pagantes) rende cerca de **R$ 21 mil por ano**; o otimista (40 mil contas, 4%) cerca de **R$ 110 mil**. Cobre custos e dá retorno modesto; só vira negócio grande com escala ou com um plano para equipes (cuidadores, clínicas), que é a fase 3. **Conta Apple: pessoa física (decisão de 10/11)**, com a porta aberta para converter para a LTDA depois (seção 6.1).

---

## 2. Cenário e concorrência (o que o mercado faz)

| App | Modelo (conforme as fontes) | O que ensina |
|---|---|---|
| **Medisafe** | Passou a **exigir assinatura** fora dos EUA a partir de 1º/jan/2026: [US$ 4,99/mês ou US$ 39,99/ano](https://help-center.medisafe.com/en/articles/13052285-medisafe-is-now-a-fully-paid-app-for-users-outside-the-u-s). O plano pago inclui medicamentos, "Medfriends" e dependentes ilimitados e trackers de saúde; relatos de terceiros dizem que o grátis ficou limitado a 2 medicamentos ([resumo](https://dev.to/wellnestapp/medisafe-went-paid-what-to-look-for-in-a-medication-tracker-now-326l)). Os concorrentes que se vendem como alternativa são suspeitos (têm interesse), então tratar como indício. | Valor percebido existe (US$ 40/ano). O **limite por número de medicamentos irritou** os usuários: não copiar. Abre espaço para um grátis generoso e **família incluída**. |
| **MyTherapy** | Gratuito com compras no app (preço não encontrado). | O grátis forte é o padrão do setor. |
| **Apps locais de lembrete** | Versão sem anúncios por **R$ 2,39/mês ou R$ 29,99 único** ([exemplo, Android](https://olhardigital.com.br/2025/10/30/dicas-e-tutoriais/5-apps-para-voce-nao-esquecer-de-tomar-remedios/)); outros ~US$ 1,99/mês (Meu Remédio, listagem); apps pagos internacionais: US$ 3,99/mês e US$ 9,99 a 19,99/ano. | A **âncora de preço no Brasil é baixa** para lembrete puro. O Medicron só justifica mais se vender **família, histórico e relatório**, não "lembrar". |
| **Apps de pet** | Não consegui preços de apps de remédio para pet (a busca não retornou). | Conferir direto nas lojas antes de fechar o preço (11pets, PetDesk etc.). |

**Posicionamento sugerido:** *"Lembrete de remédio para a casa toda: pessoas e pets, em família."* É diferente de Medisafe (individual/saúde crônica) e de apps de pet (só animais).

---

## 3. A estrutura: o que é grátis e o que é Plus

### Princípios

1. **Nunca bloquear a segurança:** receber o lembrete, marcar "Feito/Pular" e ver o Hoje são **sempre grátis**, com qualquer número de rotinas que a conta já tenha.
2. **Limites valem para criar coisas novas, não para derrubar o que existe.** Se a conta passar do limite (por exemplo, acabou o teste), as rotinas existentes **continuam avisando**; só não dá para **adicionar** paciente ou membro novo.
3. **Dados são da pessoa:** exportar os dados em CSV **continua grátis** (a LGPD garante portabilidade). O Plus cobra pelo **relatório pronto** (PDF organizado para o médico), não pelo acesso aos dados.
4. **A assinatura é da conta (família):** quem assina libera o Plus para todos os membros. É o diferencial frente a apps por pessoa.

### Quadro grátis x Medicron Plus

| Recurso | Grátis | Plus | Construído hoje? |
|---|---|---|---|
| Lembretes por notificação, Hoje, Feito/Pular | **Ilimitado** | Ilimitado | Sim |
| Pacientes (pessoas e pets) | **até 2** | **ilimitados** (ou até 10, se quiser um teto) | Sim (falta só o limite) |
| Pessoas na conta (convite por link) | **até 2** (você + 1) | **até 8** | Sim (falta o limite) |
| Rotinas por paciente | ilimitadas | ilimitadas | Sim |
| Itens (medicações e procedimentos) | ilimitados | ilimitados | Sim |
| Histórico de doses (dia passado) | **últimos 30 dias** | **completo** | Parcial (falta o corte) |
| Widgets (iPhone) | grátis (ajudam a reter) | + estilos extras (opcional) | Sim |
| Exportar dados (CSV) | **grátis** (LGPD) | grátis | Não (a construir, simples) |
| **Relatório em PDF** para médico/veterinário (adesão, atrasos, período) | só a **prévia** da 1ª página | completo | Não |
| **Avisar a família quando uma dose atrasa** (escalonamento) | não | **sim** | Não (há o disparo; falta a regra) |
| **Controle de estoque** ("restam 5, hora de comprar") | não | **sim** | Não |
| **Carteira de vacinação e peso do pet** (reforços anuais, gráfico) | só registro simples | **lembretes de reforço + gráfico** | Não |
| **Anexos** (foto da receita ou bula) em itens | não | **sim** | Não |
| Lembrete repetido até marcar | **1 repetição** em 10 min | repetição configurável | Parcial (a verificar) |
| Temas e ícone alternativo | claro, escuro e automático (já existe) | + temas e ícones extras (cosmético) | Não (extras) |

**Por que limitar pacientes e pessoas e não medicamentos:** é o que a Medisafe fez com medicamentos e irritou. Quem usa para si mesmo (1 pessoa) ou para um idoso e um pet (2) fica bem no grátis e **vira divulgador**. Quem cuida de várias pessoas e pets (a família grande, o cuidador) é quem **mais valor recebe** e quem mais paga com satisfação. E o limite de pessoas (2) é folgado o bastante para o convite por link continuar sendo um motor de crescimento.

**Importante (honestidade com a base atual):** o app hoje não limita nada. Antes de ligar limites é preciso decidir o que acontece com contas que já passam deles (a regra do princípio 2 resolve: continuam funcionando, só não criam mais).

---

## 4. Preços

### Sugestão inicial (Brasil, em reais)

| Plano | Preço | Equivalente | Observação |
|---|---|---|---|
| **Mensal** | **R$ 12,90** | R$ 12,90/mês | referência para o anual |
| **Anual** (destaque) | **R$ 89,90** | **R$ 7,49/mês** (42% a menos) | mostrar como "R$ 7,49/mês" no paywall |
| Vitalício (opcional, só mais tarde) | R$ 249,90 | | vende bem no Brasil; reduz receita recorrente: só depois do 1º ano |

**Raciocínio:** a Medisafe cobra US$ 39,99/ano. Convertendo (cerca de R$ 200 no câmbio de referência) e ajustando ao poder de compra brasileiro, o anual de R$ 89,90 fica **bem abaixo da metade** do preço dela. Fica acima dos apps simples de R$ 29,99 porque o Plus vende **família, histórico e relatório**, não só alarme. O mensal é caro de propósito (empurra para o anual). Pontos de preço da Apple em reais são fixos (R$ 9,90, 12,90, 14,90, 19,90 etc. e anuais como 79,90, 89,90, 99,90): **confirme a tabela de preços em reais no App Store Connect** antes de fechar.

**Testes depois** (não no início): R$ 9,90/R$ 79,90 contra R$ 14,90/R$ 99,90. Só com tráfego suficiente (dezenas de assinantes) e um por vez.

### Quanto fica para você (por assinante)

Referência de planejamento (**conferir antes**, as fontes divergem): comissão de **15%** para pequenos desenvolvedores (Programa de Pequenas Empresas; no Brasil, segundo a [cobertura](https://www.etvbharat.com/en/technology/apple-unveils-new-app-store-rules-in-brazil-following-regulator-agreement-enn26061904464), a Apple passou a cobrar **10% de comissão + 5% de processamento = 15%** para pequenos, contra 21% + 5% para os demais) e Google com **10%** de taxa de serviço sobre os primeiros US$ 1 milhão por ano, mais uma taxa de cobrança da Play Billing cujo valor para o Brasil **não consegui confirmar** ([anúncio de 2026](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html)). Planeje com **15%**.

| | Mensal R$ 12,90 | Anual R$ 89,90 |
|---|---|---|
| Comissão da loja (15%) | R$ 1,94 | R$ 13,49 |
| Líquido antes de impostos | R$ 10,96 | **R$ 76,41** |

Depois, **impostos do seu regime** (MEI, Simples ou outro): fale com um contador; o recebimento das lojas é receita de serviço de software.

---

## 5. As iscas (como levar o usuário ao Plus sem forçar)

1. **7 dias grátis da loja (oferta introdutória), com cartão.** Configurada no App Store Connect e no Play Console, no **plano anual** (o mensal não tem teste, para empurrar para o anual). O cartão filtra quem tem intenção real e a loja cuida da renovação, do cancelamento e dos lembretes de cobrança. Por ser pago pela loja, **cada pessoa só tem um teste por grupo de assinatura** (regra da Apple). O trade-off: menos pessoas começam o teste do que num teste sem cartão, mas uma parte maior delas paga no fim. Como o teste exige cartão, o grátis precisa **deixar a pessoa sentir o valor antes do paywall** (a prévia do relatório, o limite que encosta no uso real) e o paywall precisa mostrar **claramente** o que acontece no 8º dia (preço, data da cobrança, como cancelar).
2. **Paywall contextual, no momento do valor:**
   - ao tentar criar o **3º paciente**;
   - ao convidar a **3ª pessoa**;
   - ao abrir o **Relatório** (mostra a 1ª página e embaça o resto);
   - ao tocar em **"Avisar a família se atrasar"**;
   - ao tentar ver o histórico além de **30 dias**.
   Nunca interromper o **Hoje** nem o ato de marcar a dose.
3. **Prévia que vende:** o relatório em PDF, com a primeira página real e o resto desfocado ("12 doses atrasadas em outubro, tudo pronto para levar à consulta").
4. **Marcos de valor, uma vez só:** ao completar **7 dias seguidos**, uma faixa discreta "Sua sequência está ótima. Quer compartilhar o resumo com a família?" (leva ao Plus). Sem pop-up chato, sem notificação promocional (a Apple restringe push de marketing).
5. **Oferta sazonal:** **Black Friday** e **Dia do Cuidador/Dia do Pet**: anual com 30% de desconto no 1º ano, usando as ofertas promocionais da Apple e do Google (não exigem criar sistema de cupom).
6. **Indicação:** código de oferta ("1 mês de Plus") para quem convida uma família que ativa; as lojas têm **códigos de oferta** nativos.
7. **Aviso de fim do teste, dentro do app:** no dia 5, uma faixa "Seu teste acaba em 2 dias" (transparente, com a data da cobrança e como cancelar). O RevenueCat informa a data de fim do teste ao app.

**O que NÃO fazer:** anúncios (contradiz a promessa "sem anúncios" e a privacidade), esconder o botão de cancelar, cobrar para ver dados que a pessoa mesma cadastrou, parar lembretes de quem não pagou, "dark patterns" em contagem regressiva falsa. Num app de saúde isso gera denúncia, má avaliação e, no Brasil, problema com o CDC e a LGPD.

---

## 6. Como cobrar tecnicamente (a resposta para "assinatura pela Apple?")

### iOS: **sim, assinatura renovável pela App Store**

As diretrizes da Apple (3.1.1 e 3.1.2) exigem **compra dentro do app (IAP)** para destravar recursos digitais dentro do app iOS. A assinatura renovável é o formato certo para um recurso contínuo. Duas exceções relevantes no Brasil em 2026: após o acordo com o CADE, a Apple permite **processamento de pagamento próprio e links para pagamento externo**, com comissões ([resumo](https://www.etvbharat.com/amp/en/technology/apple-unveils-new-app-store-rules-in-brazil-following-regulator-agreement-enn26061904464): link externo com taxa de serviços de **15% (10% para pequenos)**, contra a comissão da App Store de 21% + 5%). Isso ainda tem pontos em disputa, não cobre Pix via Apple Pay e muda rápido: **não construir em cima disso agora**; vale reavaliar na fase 2.

Requisitos que a revisão confere (3.1.2): mostrar **preço, período e o que está incluso** antes de comprar; **botão "Restaurar compras"**; link para **Termos de uso** e **Política de privacidade**; cancelamento pela própria conta Apple, explicado; se houver teste, as condições dele. O app precisa de uma página de **Termos de uso** (hoje não existe: criar junto no site).

### Ferramenta: **RevenueCat** (recomendado)

- Gratuito até cerca de **US$ 2.500 de receita mensal rastreada**, depois **1%** ([fontes divergem](https://costbench.com/software/subscription-billing/revenuecat/): conferir a página de preços), o que no seu cenário base (R$ 1.800/mês) **não chega a cobrar**.
- Funciona com Expo via **build de desenvolvimento** (o que o EAS já faz); `react-native-purchases` e a tela de paywall pronta ([documentação do Expo](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial)). **Não funciona no Expo Go**: só em build nativo.
- Cuida de iOS **e** Android com a mesma lógica, recibos, renovação, reembolso, experimentos de preço.
- Alternativa sem terceiros: `expo-iap` direto, mais trabalho e mais risco de erro de recibo. Para uma pessoa só, RevenueCat compensa.

### Arquitetura (resumo)

```
App (iOS/Android) ──compra──► App Store / Google Play
        │                              │
   react-native-purchases ◄── RevenueCat ──webhook──► API (Next) ──► tabela org_plan (plano, validade, origem)
        │                                                              │
        └───────── consulta o plano da conta ◄───────────────────────┘ (a API é a FONTE DA VERDADE; o app só mostra)
```

- **Identidade:** usar o **id da organização (conta)** como `app_user_id` no RevenueCat. Assim a assinatura é da família, e qualquer membro que abre o app vê o Plus.
- **Limites no servidor:** `POST /patients`, convites, histórico e relatório consultam o plano **na API** (o app só exibe mensagens). Um cliente alterado não consegue burlar.
- **Tabela nova** (fase 1): `org_plan` (`organization_id`, `plan`, `plus_until`, `source` = `apple` | `google` | `manual`, `updated_at`; o teste de 7 dias vem da loja, então não há "trial" próprio, e `manual` serve para dar Plus aos testadores e fundadores) e o webhook do RevenueCat que a atualiza. Tudo já é por `organization_id`, então encaixa sem refazer o banco.
- **Web (PWA):** na fase 1 a web **mostra o plano e os limites**, mas a compra acontece no app (quem assinou no celular vê o Plus no navegador). Cobrança direta na web (Pix e cartão, com Stripe ou Mercado Pago, taxas bem menores que as lojas) fica na fase 2.
- **Privacidade e conformidade:** a compra adiciona dados à política: **identificador de compra e plano**. Atualizar a política, o "App Privacy" da Apple (tipo "Compras" e "ID de usuário") e a segurança de dados do Google. Se adicionar métricas de produto com SDK, também (hoje a política diz que não há análise).

---

### 6.1 Conta de desenvolvedor: pessoa física ou CNPJ? (a sua pergunta)

> **Decisão (10/11/2026): continuar como pessoa física.** Vale o que está abaixo para quem quiser converter depois; para o caminho escolhido, veja "Se você ficar como pessoa física" no fim desta seção.

**Recomendação:** assinar com o **CNPJ**. Para vender assinaturas, o ideal é a conta da Apple (e a do Google) em nome da empresa, com o banco e os impostos da empresa, e o nome da empresa como vendedor na loja. **Faça isso antes de enviar o primeiro build**, enquanto não existe app publicado, assinatura cadastrada nem histórico de vendas: depois, qualquer mudança vira um problema.

**Atualização (10/11/2026): o seu CNPJ é uma LTDA.** Isso resolve a dúvida de elegibilidade: a restrição da Apple vale para quem **não tem empresa constituída** (o "sole proprietor", como profissional autônomo ou MEI). Uma **LTDA, mesmo de um sócio só (SLU)**, é pessoa jurídica constituída e **pode** se inscrever como organização. Ser "uma empresa de uma pessoa só" não impede.

### Ficar como pessoa física ou converter? (comparação)

O app funciona **igual** nos dois casos; a diferença é jurídica, fiscal e de imagem. A decisão é sua; o que muda:

| | **Continuar pessoa física (seu nome)** | **Converter para a LTDA** |
|---|---|---|
| **Nome do vendedor na App Store** | o **seu nome completo** (nome legal; a Apple não aceita nome fantasia no lugar), visível a qualquer pessoa na página do app | o **nome da empresa** (ou o da razão social) |
| **Quem recebe o dinheiro** | **você, no CPF** (conta bancária pessoal) | **a LTDA**, em conta da empresa |
| **Imposto** | receita de pessoa física (IRPF progressivo, até 27,5%), conforme o seu contador | tributação da LTDA (ex.: Simples Nacional), que costuma ser mais baixa quando a receita cresce; a LTDA já existe e o contador sabe tratar |
| **Responsabilidade** | **pessoal** (seu patrimônio responde, p. ex., por um problema com dados de saúde) | **limitada à empresa** (regra geral; consulte o contador/advogado) |
| **Controlador de dados (LGPD)** | você, como pessoa | a empresa |
| **Google Play** | contas pessoais novas exigem **teste fechado com 12 pessoas por 14 dias** antes da produção (item 13 de `docs/passos-do-usuario.md`) | contas de **organização** não têm essa exigência (confirmar na regra atual do Google) |
| **Custo** | US$ 99/ano (Apple) + US$ 25 uma vez (Google) | **o mesmo** |
| **Esforço agora** | nenhum | D-U-N-S, conversão, ligação de verificação: 1 a 3 semanas, em paralelo à fase 0 |

**Minha recomendação continua sendo converter**, principalmente por **três** motivos: (1) o **seu nome completo ficaria público** na página de um app de saúde e família; (2) **a receita iria para o seu CPF**, não para a LTDA que você já mantém (pior em imposto e sem a proteção de responsabilidade); (3) no Google, a conta de organização **dispensa o teste fechado de 14 dias**. **Mas funciona nos dois**, e se você preferir o seu nome, é uma escolha legítima: neste caso peça ao contador que confirme como declarar a receita das lojas na pessoa física.

**O prazo importa:** decida **antes de criar o app** no App Store Connect. Há relato no fórum da Apple de **o nome do vendedor continuar sendo o pessoal depois de converter**, quando o app já existia ([discussão](https://developer.apple.com/forums/thread/813734); sem resposta conclusiva). Converter antes de existir app é o caminho mais seguro; mudar depois pode exigir suporte da Apple e, às vezes, transferência do app.

### Custos e passos da conversão (se você escolher converter)

**Custos:**
- **Anuidade da Apple: US$ 99 por ano**, a mesma para pessoa física e organização (cobrada em reais, o valor varia com o câmbio e a loja). **Não encontrei cobrança extra pela conversão** (nenhuma fonte oficial confirma; os guias de terceiros não citam taxa).
- **D-U-N-S: gratuito** (Dun & Bradstreet), mesmo que a LTDA ainda não tenha um.
- Google Play: **US$ 25, uma só vez**, na criação da conta (como organização).
- Contador: se você já tem, nada a mais; se não, é um custo mensal, mas **necessário para cobrar**.

**Passo a passo:**
1. **Dados da LTDA** em ordem: razão social e endereço **iguais** aos do cartão CNPJ; um **site** da empresa (o `medicron.com.br` serve) e, de preferência, um **e-mail no domínio da empresa**.
2. **Descobrir ou pedir o D-U-N-S** em `developer.apple.com/enroll/duns-lookup/` (precisa entrar com a conta Apple). Se não existir, a própria ferramenta encaminha o pedido gratuito à Dun & Bradstreet; levam **até 5 dias úteis**, mais até 2 para a Apple receber os dados.
3. **Abrir um chamado** no suporte do Apple Developer Program (Contato → Associação e conta) pedindo para **converter a conta de pessoa física em organização**, informando o D-U-N-S. Quem pede precisa ser **sócio ou administrador** com poder para obrigar a empresa.
4. A Apple **liga para verificar** (tenha um telefone da empresa e um site) e, depois de uma a duas semanas, confirma por e-mail.
5. No App Store Connect → **Contratos, impostos e dados bancários**: preencher os dados da LTDA (CNPJ) e **uma conta bancária em nome da empresa** (o titular precisa bater com o do contrato).
6. **Só então** criar o app (`app.medicron`) e, na fase 0, as assinaturas.
7. **Google Play:** se ainda não tem conta, criar já como **organização** (também pede o D-U-N-S); a conta pessoal do Google **não converte**.

---

### Se você ficar como pessoa física (caminho escolhido): o que preparar

**Não atrasa nada**: ficar como pessoa física **não acrescenta** passos ao calendário e dispensa a conversão (que, de todo modo, rodaria em paralelo). O que preparar, em ordem:

1. **Apple Developer Program** (US$ 99/ano) com a sua conta pessoal, se ainda não estiver ativa.
2. No App Store Connect → **Contratos, impostos e dados bancários**: assinar o **contrato de apps pagos** (**obrigatório para vender assinaturas**, mesmo o app sendo grátis) e preencher **CPF, dados fiscais e uma conta bancária em seu nome**. Faça logo: a aprovação leva alguns dias e **bloqueia o teste de compras** se faltar.
3. **Google Play Console** (US$ 25, uma vez), conta **pessoal**: lembre que contas pessoais novas exigem **teste fechado com 12 pessoas por 14 dias** antes da produção. **Comece esse teste agora**, com o build atual do app, para ele **não virar o gargalo** do lançamento Android (14 dias correm em paralelo à fase 0).
4. **Contador**: peça para confirmar como declarar a receita das lojas na pessoa física (carnê-leão/IRPF) **antes da primeira venda**.
5. **Política de privacidade**: o controlador dos dados passa a ser **você, pessoa física**, com o seu e-mail de contato (`CONTACT_EMAIL`); confira se o texto da política reflete isso.
6. **O seu nome completo será público** como vendedor na App Store e no Google Play. Se isso um dia incomodar, dá para converter para a LTDA depois (a Apple permite); o risco é o nome do vendedor continuar o pessoal para apps já existentes (seção acima), então **não conte com isso como atalho**.

---

## 7. Funcionalidades a construir, em ordem de retorno

Esforços são **estimativas grossas** de uma pessoa, para ordenar, não prazos.

| # | Funcionalidade | Valor | Esforço | Fase |
|---|---|---|---|---|
| 1 | Plano por conta + limites no servidor + telas de limite + paywall + restaurar compras + RevenueCat | libera a cobrança | 2 a 3 semanas | 1 |
| 2 | Oferta de 7 dias grátis nas lojas, tela do paywall com os termos do teste e aviso de fim de teste | conversão | 2 a 4 dias | 1 |
| 3 | Exportar CSV (grátis) e **relatório em PDF** (Plus) | valor claro para médico/veterinário | 1 a 2 semanas | 1 |
| 4 | Histórico completo (corte de 30 dias no grátis) | simples | 2 a 4 dias | 1 |
| 5 | **Avisar a família quando atrasa** (escalonamento por regra) | **o recurso mais "pagável"** para cuidadores | 1 a 2 semanas | 2 |
| 6 | Controle de estoque e reposição | alto para crônicos | 1 a 2 semanas | 2 |
| 7 | Pet: carteira de vacinação, reforços anuais e peso com gráfico | alto para tutores de pets | 2 semanas | 2 |
| 8 | Anexos (receita, bula) | médio | 1 a 2 semanas (armazenamento) | 2 |
| 9 | Cobrança na web (Pix e cartão) | margem maior | 1 a 2 semanas | 2 |
| 10 | Plano **Equipe** (cuidadores, clínicas, ILPI, vários grupos) | maior ticket | a validar | 3 |
| 11 | Apple Watch, integração com Saúde/calendário | retenção | 3 a 4 semanas | 3 |

**Ordem recomendada:** 1 + 2 + 4 + 3 na fase 1 (lança a cobrança com o que já existe e mais o relatório); depois 5 e 6 (os recursos que justificam pagar todo mês).

---

## 8. Projeção financeira (cenários, para calibrar expectativa)

Hipóteses: **70% dos pagantes escolhem o anual** (líquido R$ 76,41 por ano) e 30% o mensal (permanência média de 5 meses: 5 × R$ 10,96 = R$ 54,80). Receita líquida do 1º ano por pagante ≈ **R$ 70**, antes de impostos. Taxa de conversão = % das **contas ativas** que pagam. **São hipóteses minhas, sem fonte**: calibre com os seus números reais da fase 1.

| Cenário | Contas ativas (12 meses) | Conversão | Pagantes | Receita líquida/ano (antes de impostos) | Por mês |
|---|---|---|---|---|---|
| Conservador | 3.000 | 2% | 60 | **R$ 4,2 mil** | R$ 350 |
| **Base** | 10.000 | 3% | 300 | **R$ 21 mil** | R$ 1.750 |
| Otimista | 40.000 | 4% | 1.600 | **R$ 112 mil** | R$ 9.300 |

**Custos fixos** (a estimar): Apple Developer (US$ 99/ano), Google Play (US$ 25 uma vez), hospedagem e banco (hoje em planos baixos), e-mail transacional (quando houver recuperação de senha), contador, domínio. O cenário conservador **não paga** isso; o base paga e sobra pouco; só o otimista é um negócio. Conclusão prática: **monetizar não é urgente; crescer é**. Primeiro conquiste usuários (de graça), depois cobre de quem tem mais valor a receber.

**Como crescer:** o próprio produto é o canal (convite por link para a família, o aviso "O Medicron é um organizador..."), mais o hotsite, ASO (palavras-chave da seção do App Store Connect), grupos de cuidadores de idosos e de tutores de pets, e parcerias com clínicas veterinárias.

---

## 9. Plano em fases e critérios para avançar

### Como evitar o problema de "ligar a cobrança depois" (a sua pergunta)

Se o app fosse para as lojas **sem limites** e, meses depois, você passasse a limitar e cobrar, isso **pega mal de verdade**: quem já usa sente que algo foi tirado ("bait and switch"), a nota cai e, num app de saúde, o dano de confiança é grande. Por isso a recomendação mudou em relação à primeira versão deste documento:

1. **Não lance ilimitado.** O app **ainda não está nas lojas**, então hoje não existe usuário a quem "tirar" nada. Esse é o momento mais barato para lançar **já com as regras definitivas**.
2. **Construa a fase 1 antes do lançamento público** (**3 a 6 semanas de trabalho, conforme o escopo**, veja a tabela abaixo): limites no servidor, Plus à venda, paywall, histórico e (conforme o escopo) o relatório em PDF. Assim o 1º usuário já entra num produto com grátis claro e Plus claro.
3. **Valide em TestFlight antes**, com 20 a 50 pessoas de confiança (família, grupos de cuidadores, tutores de pets), usando os limites reais, para checar se 2 pacientes e 2 pessoas fazem sentido. Esses testadores recebem **Plus manual** (`source = manual`) como "fundadores".
4. **Regra de ouro dos limites: eles só podem afrouxar depois do lançamento, nunca apertar.** Se os números se mostrarem apertados demais, suba (de 2 para 3 pacientes, por exemplo): ninguém reclama de ganhar. Apertar é o que gera revolta.
5. **O que já existe nunca é tirado:** mesmo depois do lançamento, uma conta que passar do limite (ex.: cancelou o Plus) **mantém e continua recebendo lembretes** do que já cadastrou; só não cria novos acima do limite.

**Plano B, se mesmo assim você quiser lançar 100% grátis primeiro** (para crescer mais rápido): faça assim para não pegar mal: (a) **anuncie desde o primeiro dia**, na ficha da loja e dentro do app, que "recursos Plus chegam em [mês]"; (b) **cobre só recursos novos** (relatório, alerta à família, estoque) e deixe tudo o que já era grátis continuar grátis para as contas criadas antes da data; (c) os **limites de pacientes e pessoas valem só para contas criadas depois** da data (as antigas ficam "fundadoras" sem limite); (d) dê aos fundadores um **desconto vitalício ou de 50% no 1º ano**. Custa receita (as contas grandes antigas não pagam pelo volume), mas preserva a confiança.

### Quanto tempo leva (a sua pergunta sobre o prazo)

Esse tempo **não vem da conta de desenvolvedor** (pessoa física ou LTDA dá no mesmo): vem de **construir** o que precisa existir antes de lançar. A conversão da conta, se você tivesse escolhido a LTDA, **rodaria em paralelo** a essa construção e não alongaria o prazo; então ficar como pessoa física só **tira uma burocracia**, não encurta o calendário.

Estimativa de uma pessoa (a mesma da seção 7: itens 1, 2, 3 e 4):

| Escopo antes do lançamento | O que entra | Trabalho |
|---|---|---|
| **A. Completo** (recomendado) | limites no servidor, assinatura (RevenueCat), paywall com os termos, oferta de 7 dias, histórico completo, **relatório em PDF** | **4 a 6 semanas** |
| **B. Mínimo viável** | tudo acima **sem o PDF**: o Plus vende "mais pacientes, mais pessoas e histórico completo"; o relatório entra na 1.1 | **~3 semanas** |
| **C. Plano B (grátis primeiro)** | lançar como está, **anunciando** o Plus futuro e protegendo as contas antigas (ver acima) | **0 semana**, mas com custo de receita e de confiança |

O que **corre em paralelo** e não alonga o escopo A ou B: a **aprovação do contrato de apps pagos e dos dados bancários** (alguns dias), o **teste fechado do Google** (14 dias), o **TestFlight** com o build atual para validar o fluxo básico com testadores, a criação dos **Termos de uso** e o cadastro das assinaturas nas duas lojas. O que **depois** do código ainda soma: **revisão da Apple** (a 1ª com assinatura costuma levar de 1 a 3 dias, às vezes mais) e o ajuste de qualquer rejeição.

**Minha sugestão:** escopo **B** se a pressa for grande (lança em ~3 a 4 semanas com a revisão) e **A** se você preferir o Plus já "cheio" para justificar o preço de R$ 89,90 no primeiro dia. Em ambos, **o teste fechado do Google começa já**.

### As fases

| Fase | Quando | O que fazer | Para avançar, precisa de |
|---|---|---|---|
| **0. Preparar o lançamento com cobrança** | agora a 3 a 6 semanas (escopo A ou B) | **Preparar a conta pessoa física** (contrato de apps pagos, CPF e banco, seção 6.1) e **iniciar o teste fechado do Google**; criar os **Termos de uso**; construir os itens 1 a 4 da seção 7 (plano por conta, limites, paywall, histórico, oferta de 7 dias e, no escopo A, o relatório em PDF) e cadastrar as assinaturas nas lojas; **TestFlight** com 20 a 50 pessoas | testadores usando sem travar; assinatura de teste (sandbox) funcionando; contas e conta bancária da Apple/Google aprovadas |
| **1. Lançar a 1.0 com Plus** | após a fase 0 | Publicar nas duas lojas com o grátis e o Plus à venda; medir **do próprio banco** (sem rastreadores): contas, pacientes por conta, % que bate em limite, convites, retenção em 7 e 30 dias; e no RevenueCat: paywall, início de teste, teste para pago | **≥ 2% de conversão** em 90 dias; **retenção D30 ≥ 25%**; reembolso e suporte controlados |
| **2. Aprofundar** | 3 a 6 meses depois | itens 5 a 9 da seção 7: alerta à família, estoque, pet, anexos, cobrança na web | MRR crescendo; churn mensal **< 6%** |
| **3. Escalar** | quando a base justificar | plano Equipe, Watch, integrações | demanda comprovada de cuidadores e clínicas |

Indicadores a acompanhar (todos calculáveis no banco ou no RevenueCat, **sem rastreadores de terceiros** no app): contas novas por semana, ativas por semana, pacientes por conta, % de contas que bateram em um limite, visualizações de paywall, início de teste, **teste para pago**, MRR, churn, reembolsos, nota nas lojas.

---

## 10. Riscos e como tratar

| Risco | Tratamento |
|---|---|
| **Paywall num app de saúde pode virar escândalo** ("cobram até para eu lembrar do remédio") | Regra de ouro (seção 3): lembrete e registro sempre grátis; limites só para criar; nada de parar o que já existe; comunicar o que o grátis inclui. |
| **Reprovação na App Store** por assinatura mal explicada | Tela de preço e período claras, "Restaurar compras", Termos e Política, sem promessa clínica; seguir 3.1.2. A assinatura é enviada junto com a primeira versão que a usa. |
| **Receita pequena** (nicho) | Foco em crescimento; plano Equipe; custos baixos (RevenueCat grátis, infra enxuta). |
| **Comissões mudando** (2026 foi um ano de mudanças e as fontes divergem) | Planejar com 15%; conferir no App Store Connect e no Play Console; revisar o preço se a taxa for 26%. |
| **Impostos e conta pessoa física** | Conta no seu nome: a receita é de pessoa física e o seu nome fica público como vendedor. Falar com o contador **antes da primeira venda** (carnê-leão/IRPF); se a receita crescer, considerar converter para a LTDA (seção 6.1). |
| **Dados sensíveis (LGPD)** | Dados de saúde já estão cobertos na política; acrescentar compras e plano; manter exclusão e portabilidade (CSV grátis). |
| **Quebra de confiança** ao limitar quem já usava tudo | Evitada por desenho: **lançar já com as regras** (seção 9); os limites só afrouxam depois; o que existe nunca é tirado; testadores viram "fundadores" com Plus manual. |
| **Fraude de recibo / burla de limite** | Limites na API e webhook do RevenueCat; nunca confiar no cliente. |

---

## 11. Decisões

**Tomadas (10/11/2026):**

| # | Decisão |
|---|---|
| 1 | Regra de ouro (lembrete e registro de dose sempre grátis) e limites do grátis (**2 pacientes, 2 pessoas, 30 dias de histórico**): aprovados. |
| 2 | Preços **R$ 12,90 por mês e R$ 89,90 por ano**: aprovados. |
| 3 | Teste: **7 dias grátis da loja (com cartão)**, sem teste sem cartão. |
| 4 | **Lançar já com as regras definitivas** (seção 9), em vez de lançar ilimitado e cobrar depois. |
| 5 | **Conta de desenvolvedor: pessoa física** (nome público do vendedor, receita no CPF); a LTDA fica como opção futura (seção 6.1). |

**Em aberto:**

1. **Escopo antes do lançamento:** **A** (completo, com relatório em PDF, 4 a 6 semanas), **B** (mínimo, sem o PDF, ~3 semanas) ou **C** (plano B, grátis primeiro)? Veja a tabela da seção 9.
2. **Assinatura por conta (família)** como diferencial: confirmado? (implícito nas respostas; diga se quer mudar.)
3. **Equipe/B2B** (cuidadores, clínicas): interessa explorar já ou só depois da fase 2?
4. **Começar já o teste fechado do Google** (12 pessoas por 14 dias) com o build atual, para não travar o lançamento Android?

---

## Fontes consultadas (pesquisa de 10/11/2026; confira os números nas páginas oficiais antes de decidir)

- Medisafe: [central de ajuda](https://help-center.medisafe.com/en/articles/13052285-medisafe-is-now-a-fully-paid-app-for-users-outside-the-u-s); [análise de terceiros](https://dev.to/wellnestapp/medisafe-went-paid-what-to-look-for-in-a-medication-tracker-now-326l).
- Apps de lembrete no Brasil e preços: [Olhar Digital](https://olhardigital.com.br/2025/10/30/dicas-e-tutoriais/5-apps-para-voce-nao-esquecer-de-tomar-remedios/).
- Comissões da Apple (incluindo Programa de Pequenas Empresas): [RevenueCat](https://www.revenuecat.com/blog/engineering/app-store-fees).
- Regras novas no Brasil (CADE, 2026): [ETV Bharat](https://www.etvbharat.com/en/technology/apple-unveils-new-app-store-rules-in-brazil-following-regulator-agreement-enn26061904464), [Appcharge](https://appcharge.com/blog/apple-brazil-framework-is-now-live-what-publishers-need-to-know), [Jornal de Brasília](https://jornaldebrasilia.com.br/noticias/economia/apple-libera-sistema-de-pagamentos-em-aplicativos-no-brasil-apos-acordo-com-o-cade/).
- Google Play (taxas e cobrança alternativa, 2026): [Android Developers Blog](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html).
- RevenueCat e Expo: [Expo](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial), [documentação](https://www.revenuecat.com/docs/getting-started/installation/expo), [preços](https://costbench.com/software/subscription-billing/revenuecat/).
- Conta de desenvolvedor (pessoa física × organização, D-U-N-S, conversão, nome do vendedor): [Apple, D-U-N-S](https://developer.apple.com/br/help/account/membership/D-U-N-S/), [conversão (vendor)](https://median.co/blog/how-to-change-your-apple-developer-account-from-individual-to-organization), [nome do vendedor após converter (fórum da Apple)](https://developer.apple.com/forums/thread/813734). Fontes de terceiros e de fórum: confirme com o suporte da Apple.
