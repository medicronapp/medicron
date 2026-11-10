# Fichas das lojas (App Store e Google Play)

Textos prontos para colar nos consoles. **Para a Apple, use o guia campo a campo `docs/app-store-connect.md` (versão final dos textos, privacidade, notas de revisão e riscos de aprovação).** Tudo em português do Brasil. O Medicron **não é dispositivo médico**: organiza lembretes e registros, não diagnostica, não indica doses e não substitui orientação de profissionais de saúde.

## Identidade

- **Nome:** Medicron
- **Identificador (iOS e Android):** `app.medicron`
- **Subtítulo (iOS, até 30):** Lembretes para gente e pets (27 caracteres; o antigo "Lembretes de remédios e cuidados" tinha 32 e passava do limite)
- **Descrição curta (Google, até 80):** Lembretes de remédios e cuidados para você, sua família e seus pets.
- **Categoria:** Saúde e fitness (iOS) / Saúde e fitness (Google)
- **Palavras-chave (iOS, até 100):** remédio,medicamento,lembrete,pet,vacina,cuidados,família,dose,horário,rotina
- **Classificação etária:** definida pelo questionário de cada loja (a Apple tem a pergunta "Informações médicas ou de tratamento": app de lembrete de remédio costuma sair 12+; Google: Livre/Todos). Sem conteúdo público de usuários, sem compras, sem anúncios.
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
- **URL de marketing (App Store):** https://medicron.com.br (o hotsite, para quem não está logado)
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
- **Notificações:** o app pede permissão pelo bloco de notificações no topo da tela Conta (e um convite compacto em Hoje); não é exigida para usar o app.
- Convites: link `https://medicron.com.br/convite/...` abre o app quando instalado.

## Capturas de tela necessárias

- iPhone 6,9" (1320×2868) e 6,5" (1284×2778): Hoje, Pacientes, Rotina, Itens, Conta (mínimo 3, ideal 5).
  - **Já geradas** em `store-assets/ios/6.9/` e `store-assets/ios/6.5/`: 7 imagens (`01-hoje.png` … `05-conta.png`, mais `06-bloqueio.png` e `07-widget.png` dos widgets), no estilo do hotsite.
  - **Como são feitas, padrões visuais, como alterar ou criar telas e o plano para o Android: `docs/imagens-da-loja.md`.** Para refazer: `cd apps/app && npx expo export -p web && node scripts/finalize-web.cli.ts && npm run capture-store-shots`.
  - **Slides 6 e 7 (widgets):** os widgets são nativos do iOS e não dá para fotografá-los pelo app web; são **reproduzidos em HTML** a partir do código de `src/widgets/*` e das mesmas props que o app entrega (um teste confere com `buildWidgetTimeline`). Quando houver um build iOS instalado, vale conferir contra uma captura real do aparelho antes de enviar.
  - **Crédito da foto de fundo do slide 6:** "Misty mountain peaks at sunrise", de Julien Riedel (Unsplash), usada sob a [Unsplash License](https://unsplash.com/license) (uso comercial livre, sem atribuição obrigatória). Página: https://unsplash.com/photos/misty-mountain-peaks-at-sunrise-with-warm-light-sizw4cX8Sds. O arquivo está em `store-assets/source/lock-wallpaper.jpg`; para trocar, substitua-o e rode a captura.
- Android telefone: 1080×1920 ou maior (mínimo 2, ideal 5), mesmas telas de app (**sem** os slides de widgets: o Medicron não tem widgets no Android). **Já geradas** em `store-assets/android/1080x1920/` (`01-hoje.png` … `05-conta.png`), mais o gráfico de destaque `store-assets/android/feature-graphic-1024x500.png`. Detalhes em `docs/imagens-da-loja.md`.
- Ícone 1024×1024 (iOS, sem transparência) e 512×512 (Google); gráfico de destaque 1024×500 (Google). **Já gerados** em `store-assets/icons/` (`ios-1024.png`, `android-512.png`) e `store-assets/android/feature-graphic-1024x500.png`; o passo a passo do envio está em `docs/passos-do-usuario.md`, seção I.
- iPad não é necessário (`supportsTablet: false`).
