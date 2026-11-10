# Monetização do Medicron: plano de negócio (proposta)

Documento de estratégia, **não** de implementação: nada aqui foi construído. Serve para você decidir o modelo, os preços e a ordem das coisas antes de abrir o código. Data da pesquisa: 10/11/2026. Os números de comissão e de concorrentes mudaram bastante em 2026 e **as fontes se contradizem em alguns pontos**; onde isso importa, o texto avisa e diz o que conferir.

---

## 1. Resumo (a recomendação em 10 linhas)

1. **Modelo: freemium com assinatura** (`Medicron Plus`), cobrada **por conta** (a família inteira se beneficia), não por pessoa.
2. **Regra de ouro (inegociável):** lembretes e o registro de doses são **gratuitos para sempre**. Nunca cobrar para a pessoa ser avisada do remédio. É ético, protege a reputação e reduz o risco de reprovação e de avaliações ruins (a Medisafe recebeu muitas críticas, segundo relatos de terceiros, ao apertar o grátis em 2026).
3. **Iscas e limites** ficam em **escala** (mais pacientes, mais pessoas na conta, histórico longo, relatório para o médico ou veterinário) e em **conforto** (alertar a família quando uma dose atrasa, controle de estoque), não na segurança básica.
4. **Preço sugerido para começar:** **R$ 12,90 por mês** e **R$ 89,90 por ano** (equivale a R$ 7,49/mês; desconto de 42%). Destacar o anual.
5. **Isca principal:** **teste reverso de 14 dias**, sem cartão: a conta nova começa com tudo liberado e, depois, cai para o plano grátis **sem perder dados nem parar lembretes já configurados**.
6. **Apple:** sim, **assinatura renovável automática pela App Store** (é obrigatória para destravar recursos digitais dentro do app iOS), operada por **RevenueCat** (grátis até US$ 2.500 de receita mensal), com o **servidor da API como fonte da verdade** dos limites.
7. **Google Play:** a mesma assinatura via Play Billing (também pelo RevenueCat).
8. **Web/Pix:** fica para a fase 2 (cobrança fora das lojas, com taxa muito menor). No iOS, as regras novas do Brasil (2026) permitem link para pagamento externo, com comissão; avaliar depois.
9. **Não lançar o paywall já.** Lance a 1.0 **100% gratuita**, meça uso por 8 a 12 semanas com dados do próprio banco (sem rastreadores) e só então ligue a cobrança, com critérios claros (seção 9).
10. **Expectativa honesta:** é um nicho. O cenário base (10 mil contas ativas, 3% pagantes) rende cerca de **R$ 21 mil por ano**; o otimista (40 mil contas, 4%) cerca de **R$ 110 mil**. Cobre custos e dá retorno modesto; só vira negócio grande com escala ou com um plano para equipes (cuidadores, clínicas), que é a fase 3.

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

1. **Teste reverso de 14 dias, sem cartão.** A conta nova começa com **tudo do Plus liberado**; no dia 14 volta ao grátis sem perder nada. Funciona melhor que o teste "pague depois": o usuário **cria os 3º e 4º pacientes, convida a família, usa o relatório**, e criou o hábito antes da cobrança. (É controlado no servidor: `plus_until` na conta; não depende da loja.)
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
7. **Aviso de fim do teste, dentro do app:** no dia 12, uma faixa "Seu teste acaba em 2 dias: o que muda" (transparente, com a lista do que fica e do que sai).

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
- **Tabela nova** (fase 1): `org_plan` (`organization_id`, `plan`, `plus_until`, `source` = `trial` | `apple` | `google` | `manual`, `updated_at`) e o webhook do RevenueCat que a atualiza. Tudo já é por `organization_id`, então encaixa sem refazer o banco.
- **Web (PWA):** na fase 1 a web **mostra o plano e os limites**, mas a compra acontece no app (quem assinou no celular vê o Plus no navegador). Cobrança direta na web (Pix e cartão, com Stripe ou Mercado Pago, taxas bem menores que as lojas) fica na fase 2.
- **Privacidade e conformidade:** a compra adiciona dados à política: **identificador de compra e plano**. Atualizar a política, o "App Privacy" da Apple (tipo "Compras" e "ID de usuário") e a segurança de dados do Google. Se adicionar métricas de produto com SDK, também (hoje a política diz que não há análise).

---

## 7. Funcionalidades a construir, em ordem de retorno

Esforços são **estimativas grossas** de uma pessoa, para ordenar, não prazos.

| # | Funcionalidade | Valor | Esforço | Fase |
|---|---|---|---|---|
| 1 | Plano por conta + limites no servidor + telas de limite + paywall + restaurar compras + RevenueCat | libera a cobrança | 2 a 3 semanas | 1 |
| 2 | Teste reverso de 14 dias e fim de teste "suave" | conversão | 3 a 5 dias | 1 |
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

Hipóteses: **70% dos pagantes escolhem o anual** (líquido R$ 76,41 por ano) e 30% o mensal (permanência média de 5 meses: 5 × R$ 10,96 = R$ 54,80). Receita líquida do 1º ano por pagante ≈ **R$ 70**, antes de impostos. Taxa de conversão = % das **contas ativas** que pagam. **São hipóteses minhas, sem fonte**: calibre com os seus números reais da fase 0.

| Cenário | Contas ativas (12 meses) | Conversão | Pagantes | Receita líquida/ano (antes de impostos) | Por mês |
|---|---|---|---|---|---|
| Conservador | 3.000 | 2% | 60 | **R$ 4,2 mil** | R$ 350 |
| **Base** | 10.000 | 3% | 300 | **R$ 21 mil** | R$ 1.750 |
| Otimista | 40.000 | 4% | 1.600 | **R$ 112 mil** | R$ 9.300 |

**Custos fixos** (a estimar): Apple Developer (US$ 99/ano), Google Play (US$ 25 uma vez), hospedagem e banco (hoje em planos baixos), e-mail transacional (quando houver recuperação de senha), contador, domínio. O cenário conservador **não paga** isso; o base paga e sobra pouco; só o otimista é um negócio. Conclusão prática: **monetizar não é urgente; crescer é**. Primeiro conquiste usuários (de graça), depois cobre de quem tem mais valor a receber.

**Como crescer:** o próprio produto é o canal (convite por link para a família, o aviso "O Medicron é um organizador..."), mais o hotsite, ASO (palavras-chave da seção do App Store Connect), grupos de cuidadores de idosos e de tutores de pets, e parcerias com clínicas veterinárias.

---

## 9. Plano em fases e critérios para avançar

| Fase | Quando | O que fazer | Para avançar, precisa de |
|---|---|---|---|
| **0. Lançar 100% grátis** | agora a +12 semanas | Publicar a 1.0 (passos do usuário), sem cobrança. Medir **do próprio banco**: contas, pacientes por conta, convites enviados e aceitos, doses registradas, retenção em 7 e 30 dias. | **≥ 1.000 contas**, retenção D30 **≥ 25%**, e **≥ 15% das contas com 3+ pacientes ou 2+ pessoas** (prova de que o limite do grátis encosta no uso real) |
| **1. Ligar a cobrança** | após a fase 0 | itens 1 a 4 da seção 7: plano por conta, limites, paywall, teste reverso, RevenueCat, relatório em PDF, Termos de uso | **≥ 2% de conversão** em 90 dias; reembolso e suporte controlados |
| **2. Aprofundar** | 3 a 6 meses depois | itens 5 a 9: alerta à família, estoque, pet, anexos, cobrança na web | MRR crescendo; churn mensal **< 6%** |
| **3. Escalar** | quando a base justificar | plano Equipe, Watch, integrações | demanda comprovada de cuidadores/clínicas |

Indicadores a acompanhar (todos calculáveis no banco ou no RevenueCat, **sem rastreadores de terceiros** no app): contas novas por semana, ativas por semana, pacientes por conta, % de contas que bateram em um limite, visualizações de paywall, início de teste, **teste para pago**, MRR, churn, reembolsos, nota nas lojas.

---

## 10. Riscos e como tratar

| Risco | Tratamento |
|---|---|
| **Paywall num app de saúde pode virar escândalo** ("cobram até para eu lembrar do remédio") | Regra de ouro (seção 3): lembrete e registro sempre grátis; limites só para criar; nada de parar o que já existe; comunicar o que o grátis inclui. |
| **Reprovação na App Store** por assinatura mal explicada | Tela de preço e período claras, "Restaurar compras", Termos e Política, sem promessa clínica; seguir 3.1.2. A assinatura é enviada junto com a primeira versão que a usa. |
| **Receita pequena** (nicho) | Foco em crescimento; plano Equipe; custos baixos (RevenueCat grátis, infra enxuta). |
| **Comissões mudando** (2026 foi um ano de mudanças e as fontes divergem) | Planejar com 15%; conferir no App Store Connect e no Play Console; revisar o preço se a taxa for 26%. |
| **Impostos e CNPJ** | A Apple e o Google pagam ao desenvolvedor líquido de comissão; o tratamento tributário depende do seu enquadramento (MEI, Simples, outro). Falar com contador **antes** de ligar a cobrança (ser pessoa física ou jurídica também define o nome que aparece como vendedor nas lojas e como os pagamentos são tributados). |
| **Dados sensíveis (LGPD)** | Dados de saúde já estão cobertos na política; acrescentar compras e plano; manter exclusão e portabilidade (CSV grátis). |
| **Quebra de confiança com contas existentes** | Quem entrar antes da cobrança recebe o **teste reverso** ao ligar a cobrança, com aviso com antecedência, e os limites valem só para criar coisas novas. |
| **Fraude de recibo / burla de limite** | Limites na API e webhook do RevenueCat; nunca confiar no cliente. |

---

## 11. Decisões que precisam de você

1. **Concorda com a regra de ouro** (lembrete e registro de doses sempre grátis) e com os limites do grátis (**2 pacientes, 2 pessoas, 30 dias de histórico**)? Quer outro número?
2. **Preço:** começar com **R$ 12,90 / R$ 89,90**? Ou mais baixo (R$ 9,90 / R$ 79,90) para ganhar volume?
3. **Teste reverso de 14 dias sem cartão** (recomendado) ou teste da loja (7 dias, pede cartão)?
4. **Assinatura por conta (família)** como diferencial, confirmado?
5. **Quando ligar a cobrança:** esperar os critérios da fase 0 (recomendado) ou já na 1.1?
6. **Formalização:** você tem ou pretende abrir CNPJ (MEI/Simples)? Isso afeta a conta de desenvolvedor, o recebimento e os impostos.
7. **Equipe/B2B** (cuidadores, clínicas): interessa explorar já ou só depois?

---

## Fontes consultadas (pesquisa de 10/11/2026; confira os números nas páginas oficiais antes de decidir)

- Medisafe: [central de ajuda](https://help-center.medisafe.com/en/articles/13052285-medisafe-is-now-a-fully-paid-app-for-users-outside-the-u-s); [análise de terceiros](https://dev.to/wellnestapp/medisafe-went-paid-what-to-look-for-in-a-medication-tracker-now-326l).
- Apps de lembrete no Brasil e preços: [Olhar Digital](https://olhardigital.com.br/2025/10/30/dicas-e-tutoriais/5-apps-para-voce-nao-esquecer-de-tomar-remedios/).
- Comissões da Apple (incluindo Programa de Pequenas Empresas): [RevenueCat](https://www.revenuecat.com/blog/engineering/app-store-fees).
- Regras novas no Brasil (CADE, 2026): [ETV Bharat](https://www.etvbharat.com/en/technology/apple-unveils-new-app-store-rules-in-brazil-following-regulator-agreement-enn26061904464), [Appcharge](https://appcharge.com/blog/apple-brazil-framework-is-now-live-what-publishers-need-to-know), [Jornal de Brasília](https://jornaldebrasilia.com.br/noticias/economia/apple-libera-sistema-de-pagamentos-em-aplicativos-no-brasil-apos-acordo-com-o-cade/).
- Google Play (taxas e cobrança alternativa, 2026): [Android Developers Blog](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html).
- RevenueCat e Expo: [Expo](https://expo.dev/blog/expo-revenuecat-in-app-purchase-tutorial), [documentação](https://www.revenuecat.com/docs/getting-started/installation/expo), [preços](https://costbench.com/software/subscription-billing/revenuecat/).
