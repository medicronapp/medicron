# Fichas das lojas (App Store e Google Play)

Textos prontos para colar nos consoles. Tudo em português do Brasil. O Medicron **não é dispositivo médico**: organiza lembretes e registros, não diagnostica, não indica doses e não substitui orientação de profissionais de saúde.

## Identidade

- **Nome:** Medicron
- **Identificador (iOS e Android):** `app.medicron`
- **Subtítulo (iOS, até 30):** Lembretes de remédios e cuidados
- **Descrição curta (Google, até 80):** Lembretes de remédios e cuidados para você, sua família e seus pets.
- **Categoria:** Saúde e fitness (iOS) / Saúde e fitness (Google)
- **Palavras-chave (iOS, até 100):** remédio,medicamento,lembrete,pet,vacina,cuidados,família,dose,horário,rotina
- **Classificação etária:** 4+ (iOS) / Livre (Google). Sem conteúdo gerado por usuários público, sem compras, sem anúncios.
- **Preço:** gratuito, sem compras no app.

## Descrição longa

O Medicron ajuda você a não esquecer o que importa: o remédio da vovó, a vacina do cachorro, o vermífugo do gato, a vitamina das crianças.

- Cadastre pessoas e pets e as rotinas de cada um (medicamentos, vacinas, vermífugos e outros cuidados), com doses e horários.
- Veja o que falta fazer hoje e marque cada dose como dada.
- Receba lembretes no celular na hora certa.
- Cuide em família: convide outras pessoas para a mesma conta e todo mundo vê a mesma agenda.
- Tema claro, escuro ou automático.

Importante: o Medicron é um organizador de lembretes. Ele não faz diagnóstico nem recomenda tratamentos ou doses. Siga sempre a orientação do seu médico ou veterinário.

## Links obrigatórios

- **Política de privacidade:** https://medicron.com.br/privacidade
- **Suporte / contato:** o e-mail definido em `CONTACT_EMAIL` (mostrado na política) — informe o mesmo nos consoles.
- **Exclusão de conta (Google pede URL):** use a política de privacidade, seção "Como excluir seus dados"; a exclusão é feita no app em Conta → Excluir conta.

## Questionário de privacidade — Apple (App Privacy)

Rastreamento (tracking): **não**. Nenhum dado é usado para rastrear entre apps/sites de terceiros.

| Tipo de dado | Coletado | Finalidade | Vinculado ao usuário |
|---|---|---|---|
| Nome | Sim | Funcionalidade do app | Sim |
| E-mail | Sim | Funcionalidade do app / conta | Sim |
| Informações de saúde e fitness (medicamentos, doses registradas) | Sim | Funcionalidade do app | Sim |
| Identificadores de dispositivo (token de notificação) | Sim | Funcionalidade do app (lembretes) | Sim |
| Conteúdo do usuário (pacientes, itens, rotinas) | Sim | Funcionalidade do app | Sim |

Não coletamos: localização, contatos, fotos, dados financeiros, histórico de navegação, dados de uso para anúncios, diagnósticos.

## Questionário — Google Play (Segurança dos dados)

- Coleta dados: **sim**. Compartilha dados com terceiros: **não** (apenas provedores que processam em nosso nome: hospedagem, banco de dados e envio de notificações).
- Dados coletados: Informações pessoais (nome, e-mail); Saúde e fitness (medicamentos e doses); Identificadores de dispositivo (token de notificação); Conteúdo do app (pacientes, itens, rotinas).
- Finalidade: funcionalidade do app e gerenciamento da conta. Nenhuma para anúncios ou marketing.
- Criptografia em trânsito: **sim** (HTTPS).
- O usuário pode pedir a exclusão dos dados: **sim**, no app (Conta → Excluir conta) — e a URL da política descreve o processo.
- Aplicativo de saúde: declarar que **não** é dispositivo médico e não oferece diagnóstico.

## Notas para a revisão

- **Conta de demonstração:** crie uma conta de teste (e-mail e senha de sua escolha, que não sejam os seus pessoais) com um paciente e uma rotina, e informe nos campos de "informações de login" das duas lojas.
- Fluxo: Entrar → Hoje (lista de doses) → Pacientes → Rotinas → Itens → Conta.
- **Exclusão de conta:** Conta → rolar até "Excluir conta" → informar a senha → confirmar.
- **Notificações:** o app pede permissão na tela Conta → Notificações; não é exigida para usar o app.
- Convites: link `https://medicron.com.br/convite/...` abre o app quando instalado.

## Capturas de tela necessárias

- iPhone 6,9" (1320×2868) e 6,5" (1284×2778): Hoje, Pacientes, Rotina, Itens, Conta (mínimo 3, ideal 5).
- Android telefone: 1080×1920 ou maior (mínimo 2, ideal 5), mesmas telas.
- Ícone 1024×1024 (iOS, sem transparência) e 512×512 (Google); gráfico de destaque 1024×500 (Google).
- iPad não é necessário (`supportsTablet: false`).
