# App Store Connect: o que preencher, na ordem do painel

Guia para você preencher o painel da Apple e enviar o Medicron para revisão. Tudo em português do Brasil, pronto para copiar. As imagens e ícones já estão em `store-assets/` (detalhes em `docs/imagens-da-loja.md`). Os textos gerais das fichas e o questionário do Google ficam em `docs/lojas.md`; **este arquivo é a versão final para a Apple** (ele corrige o subtítulo de `lojas.md`, que passava do limite de 30 caracteres).

Antes de começar, tenha em mãos: conta no Apple Developer Program ativa, o build iOS enviado ao TestFlight (itens 11 e 19 de `docs/passos-do-usuario.md`) e a conta de demonstração (item 4 da seção "Antes de enviar", no fim).

> Os campos com **(até N)** têm limite de caracteres. Um teste (`tests/app-store-connect-doc.test.ts`) confere que cada texto deste documento respeita o limite e não cita outras plataformas; se editar, rode `npm test` em `apps/app`.

---

## 1. Criar o app (Apps → "+" → Novo app)

| Campo | Valor |
|---|---|
| Plataformas | iOS |
| Nome | Medicron |
| Idioma principal | Português (Brasil) |
| ID do pacote (Bundle ID) | `app.medicron` (aparece depois do primeiro build enviado pelo EAS, ou registre em developer.apple.com → Identifiers) |
| SKU | `medicron-ios` (qualquer texto único, só você vê) |
| Acesso de usuário | Acesso total |

Se o nome "Medicron" já estiver em uso por outro app, a Apple avisa nesta tela: nesse caso use "Medicron: lembretes de remédio" (a Apple permite até 30 caracteres).

---

## 2. Informações do app (App Store → Informações do app)

### Nome (até 30)

```
Medicron
```

### Subtítulo (até 30)

```
Lembretes para gente e pets
```

| Campo | Valor |
|---|---|
| Categoria principal | **Saúde e fitness** |
| Categoria secundária | Produtividade (opcional) |
| Direitos de conteúdo | "Não, meu app não contém, não mostra nem acessa conteúdo de terceiros" |
| Classificação etária | Responda o questionário **com a verdade** (ver abaixo); não tente forçar uma faixa |
| Licença | Contrato de licença padrão da Apple |

**Por que Saúde e fitness e não Medicina:** a categoria Medicina atrai uma análise mais rigorosa de apps que "tratam" ou "medem" algo. O Medicron só organiza lembretes e registros, então Saúde e fitness descreve melhor o que ele é.

**Questionário de classificação etária (resumo do que responder):** o app **não** tem violência, conteúdo sexual, linguagem imprópria, apostas, álcool/drogas como conteúdo, nem conteúdo gerado por usuários visível para estranhos, nem compras. A pergunta de "Informações médicas ou de saúde" trata de **conteúdo** que o app apresente; o Medicron apresenta apenas o que o próprio usuário cadastra e **não** dá orientação médica, então responda "nenhum/não" para conteúdo médico e, se houver a pergunta sobre "tópicos de saúde e bem-estar", responda conforme a definição da tela. A faixa final é calculada pela Apple (espere 4+ a 12+).

---

## 3. Preços e disponibilidade

| Campo | Valor |
|---|---|
| Preço | **Gratuito** (Preço base: US$ 0,00) |
| Disponibilidade | **Brasil** (recomendado no começo: o app só está em português); acrescente Portugal se quiser |
| Compras no app | Nenhuma |
| Pré-venda | Não |
| Disponibilizar para Mac com Apple Silicon / Vision | Desmarque (o app não foi feito para eles) |

App gratuito **não** exige o contrato de apps pagos nem dados bancários.

---

## 4. Privacidade do app (App Store → Privacidade do app)

### URL da política de privacidade

```
https://medicron.com.br/privacidade
```

**Você coleta dados? Sim.** **Rastreamento (tracking): Não** (nenhum dado é usado para rastrear entre apps e sites de terceiros; por isso **não** é preciso o aviso de rastreamento do iOS).

Em "Tipos de dados", marque exatamente estes (todos: **vinculados à identidade do usuário = Sim**; **usados para rastreamento = Não**; finalidade = **Funcionalidade do app**):

| Categoria da Apple | Tipo | Por que |
|---|---|---|
| Informações de contato | Nome | conta e identificação na família |
| Informações de contato | Endereço de e-mail | entrar na conta |
| Saúde e fitness | Saúde | medicamentos e doses registradas pelo usuário |
| Identificadores | ID do dispositivo | token de notificação (envio dos lembretes) |
| Conteúdo do usuário | Outro conteúdo do usuário | pacientes, itens e rotinas cadastrados |

**Não marque:** localização, contatos, fotos/vídeos, dados financeiros, histórico de navegação/pesquisa, dados de uso/análise, diagnósticos, compras. (O app não tem anúncios nem ferramenta de análise.) A senha não é um "tipo de dado" do questionário; ela é guardada só como hash (está na política).

---

## 5. Página da versão (App Store → iOS App → 1.0 Preparar para envio)

### Capturas de tela

- **iPhone 6,9":** arraste os 7 arquivos de `store-assets/ios/6.9/`, nesta ordem: `01-hoje`, `02-pacientes`, `03-rotina`, `04-itens`, `05-conta`, `06-bloqueio`, `07-widget`.
- Se o painel pedir também **6,5"**: use os de `store-assets/ios/6.5/`.
- Antes de enviar, compare os slides 06 e 07 (widgets) com o iPhone real (item 29 de `docs/passos-do-usuario.md`).

### Texto promocional (até 170)

```
Lembretes de remédio, vacina e cuidados para você, sua família e seus pets. Veja o que falta hoje e cuide junto, com todo mundo na mesma agenda.
```

### Descrição (até 4000)

```
O Medicron ajuda você a não esquecer o que importa: o remédio de quem você cuida, a vacina do cachorro, o vermífugo do gato, a vitamina das crianças.

• Cadastre pessoas e pets e a rotina de cada um (medicamentos, vacinas, vermífugos e outros cuidados), com doses e horários.
• Veja o que falta fazer hoje e marque cada dose como feita ou pulada.
• Receba lembretes no celular na hora certa.
• Cuide em família: convide outras pessoas por link para a mesma conta, e todo mundo vê a mesma agenda e o que já foi dado.
• Widgets no iPhone: o anel do dia, as próximas doses e as pendentes, na tela inicial e na tela de bloqueio.
• Tema claro, escuro ou automático.

Gratuito, sem anúncios. Você pode apagar a sua conta e tudo o que cadastrou direto no app (Conta → Excluir conta).

Importante: o Medicron é um organizador de lembretes. Ele não faz diagnóstico nem indica doses ou tratamentos. Siga sempre a orientação do seu médico ou veterinário.
```

### Palavras-chave (até 100)

Separadas por vírgula, sem espaços. Não repete palavras do nome e do subtítulo (a Apple já as indexa).

```
remédio,medicamento,vacina,vermífugo,dose,horário,rotina,família,cuidados,saúde,agenda,alarme
```

### Novidades desta versão (até 4000)

```
Primeira versão do Medicron.
```

| Campo | Valor |
|---|---|
| URL de suporte | `https://medicron.com.br` (precisa mostrar um contato: ver risco 3 abaixo) |
| URL de marketing | `https://medicron.com.br` |
| Copyright | `2026 <seu nome ou o nome da empresa>` |
| Versão | `1.0.0` |
| Build | selecione o build que veio do EAS (item 11 ou 19 de `docs/passos-do-usuario.md`); aparece depois de ~15 min do envio |
| Ícone do app | vem do build (`apps/app/assets/icon.png`); a página **não** pede upload |
| Conformidade de exportação | o app já declara `ITSAppUsesNonExemptEncryption = false` (só usa HTTPS), então o painel não pergunta |
| Lançamento da versão | **Manualmente** (recomendado: você escolhe a hora depois da aprovação) |

---

## 6. Informações para a revisão (mesma página da versão)

| Campo | Valor |
|---|---|
| Exige login? | **Sim** |
| Usuário (e-mail) | o e-mail da conta de demonstração (item 4 de "Antes de enviar") |
| Senha | a senha da conta de demonstração |
| Nome do contato | seu nome |
| Telefone | seu telefone com DDI (a Apple exige; só a equipe de revisão vê) |
| E-mail do contato | o e-mail de suporte (o mesmo de `CONTACT_EMAIL`) |

### Notas para o revisor (até 4000)

Em inglês, porque o revisor pode não ler português. Cole como está:

```
Medicron is a free reminder app for medications and care routines (for people and pets), used alone or with family. It is an organizer only: it does NOT diagnose, calculate or recommend doses or treatments, and says so in the app (sign-in screens and Account tab) and in the description. The app interface is in Brazilian Portuguese.

How to review:
1. Sign in with the demo account above (no e-mail verification is needed). It already has patients and routines.
2. "Hoje" (Today): doses due today. Tap "Feito" (Done) to mark one as given.
3. "Pacientes" (Patients): open a patient, then the "Rotina" (Routine) tab to see schedules. "Itens" (Items): medications and procedures.
4. "Conta" (Account): invite people by link, appearance, notifications ("Ativar" button) and "Excluir minha conta" (in-app account deletion: asks for the password, then removes the account and its data).

Notes:
- No in-app purchases, no ads, no tracking, no third-party sign-in. The account is e-mail and password.
- Push notifications are optional and only requested when the user taps "Ativar" (Account tab or Today tab).
- Home Screen and Lock Screen widgets (iOS) are added manually from the widget gallery: "Medicron", "Medicron · Agora" and "Medicron · Progresso".
- Invitation links (https://medicron.com.br/convite/...) open the app when installed.
- Privacy policy: https://medicron.com.br/privacidade (also linked inside the app).
```

---

## 7. Enviar

1. Confira a lista "Antes de enviar" abaixo.
2. Página da versão → **Adicionar para revisão** → **Enviar para revisão**.
3. A primeira revisão costuma levar de 1 a 2 dias. Se for rejeitada, a mensagem vem no próprio painel (e por e-mail) com a diretriz citada: responda no painel ou corrija e reenvie o build.

### Comandos do build (em `apps/app`)

```bash
npx eas-cli build --platform ios --profile production   # gera o build (pede login Apple na 1ª vez)
npx eas-cli submit --platform ios                       # envia ao App Store Connect/TestFlight
```

---

## Antes de enviar (checklist)

1. **Rodar o app pelo TestFlight** e passar pelo fluxo de `docs/passos-do-usuario.md`, seção D (login, Hoje, Pacientes, convite, **Excluir conta**).
2. **`CONTACT_EMAIL` definido** na Vercel da API **e** no `medicron-web` (itens 8 e 24 de `docs/passos-do-usuario.md`) e os dois publicados. Sem isso a política de privacidade e o hotsite não mostram um contato.
3. **`EXTRA_TRUSTED_ORIGINS=exp://**` removido** da API (item 15) e a API publicada.
4. **Conta de demonstração**: crie uma conta nova (e-mail e senha que **não** sejam seus pessoais), com 1 ou 2 pacientes, uma rotina de cada e algumas doses para Hoje não ficar vazio. Não envolve verificação de e-mail (o app não exige).
5. **`APPLE_TEAM_ID`** definido na API (item 8) para os links de convite abrirem o app (sem ele, abrem no navegador).
6. **App Group dos widgets** criado (item 20), senão o build falha.
7. **Imagens**: slides 06 e 07 conferidos no aparelho (item 29).

---

## Pontos de objeção na revisão (e como ficaram)

Avaliação honesta, contra as Diretrizes de Revisão da App Store. Com os itens 1 a 5 resolvidos, a chance de aprovação na primeira revisão é boa: o app é simples, gratuito, sem compras, sem anúncios, sem rastreamento e com exclusão de conta dentro do app.

| # | Risco | Diretriz | Situação |
|---|---|---|---|
| 1 | **Link da política de privacidade dentro do app** não existia (só estava nas fichas). A Apple exige nas duas partes. | 5.1.1(i) | **Corrigido**: link no fim da tela Conta e nas telas de entrar e criar conta (`LegalNote`), com teste. Entra no próximo build. |
| 2 | **Aviso de que não é dispositivo médico** só existia no hotsite e nas fichas; apps de saúde são vistos com mais rigor. | 1.4.1, 5.1.3 | **Corrigido**: o mesmo aviso agora aparece no app (entrar, criar conta e Conta). |
| 3 | **Contato de suporte funcional**: a URL de suporte precisa levar a um contato real, e a política mostra o e-mail só se `CONTACT_EMAIL` existir. | 1.5, 5.1.1 | **Ação sua (bloqueia)**: definir `CONTACT_EMAIL` na API e no `medicron-web` e republicar (checklist item 2). |
| 4 | **Conta de demonstração** com dados: sem ela o revisor não passa do login e rejeita ("não conseguimos entrar"). | 2.1 | **Ação sua**: checklist item 4. |
| 5 | **Servidor no ar durante a revisão** (a API em `medicron.com.br`) e sem a configuração de teste (`EXTRA_TRUSTED_ORIGINS`). | 2.1 | **Ação sua**: checklist itens 2, 3 e 5. |
| 6 | **Subtítulo com 32 caracteres** (o campo aceita 30) em `docs/lojas.md`. | 2.3 | **Corrigido** neste documento ("Lembretes para gente e pets", 27). |
| 7 | **Capturas devem mostrar o app em uso** e não podem citar outras plataformas, preço nem termos fora do tema. Os slides 06 e 07 (widgets) são reproduções, não capturas do aparelho. | 2.3.3, 2.3.7, 2.3.10 | Telas 01 a 05 são reais. **Ação sua**: conferir 06 e 07 no iPhone. Textos não citam Android nem preço. |
| 8 | **Saúde**: não alegar benefício clínico ("melhora adesão", "trata", "ideal para…"). | 1.4.1 | Textos revisados: só falam de lembretes e organização. Mantenha assim ao editar. |
| 9 | **Sem "Esqueci minha senha"**: não é exigência da Apple, mas quem esquecer a senha fica sem acesso (o app não envia e-mail de recuperação). | 2.1 (qualidade) | **Aceitável para a 1ª versão**; recomendo implementar logo depois (precisa de um serviço de envio de e-mail). |
| 10 | **Login com a Apple** só é exigido quando o app oferece login por terceiros (Google, Facebook). O Medicron usa só conta própria. | 4.8 | **Não exigido hoje**. Se um dia adicionar login social, passa a ser. |
| 11 | **Notificações**: precisam ser opcionais e sem propaganda. | 4.5.4 | OK: pedidas só ao tocar em "Ativar"; o texto é sobre doses. |
| 12 | **Exclusão de conta** precisa existir dentro do app. | 5.1.1(v) | OK: Conta → Excluir minha conta (pede a senha). |
| 13 | **Idioma**: o app só existe em português. O revisor pode não ler português. | 2.1 | Notas de revisão em inglês e disponibilidade só no Brasil (seções 3 e 6). |
| 14 | **Nome "Medicron"**: precisa estar livre na App Store e não violar marca de terceiros. | 5.2 | **Ação sua**: o painel avisa se o nome estiver em uso; vale uma busca de marca no INPI. |
| 15 | **Convites por link** (universal links) dependem do `APPLE_TEAM_ID`; sem ele abrem no navegador (o convite continua funcionando por lá). | 2.1 | **Ação sua**: checklist item 5. |
| 16 | **Menores de idade**: o app permite cadastrar crianças como pacientes, mas a conta é de um adulto; o app não é voltado a crianças. | 1.3, 5.1.4 | OK; não use a categoria "Crianças". Se quiser, a política pode dizer "uso por maiores de 18 anos". |

Já em conformidade (nenhuma ação): compras no app (não há, 3.1.1), anúncios (não há), rastreamento (não há; sem o aviso de transparência), criptografia (só HTTPS, `ITSAppUsesNonExemptEncryption = false`), permissões (nenhuma exige texto de uso no `Info.plist`).
