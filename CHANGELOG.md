# Changelog

Versões do **app** (iPhone/Android), seguindo o [SemVer](https://semver.org/lang/pt-BR/): `MAJOR.MINOR.PATCH`.
O servidor (API) e o site são publicados à parte, sem número de versão próprio: o que mudou neles aparece em "Sem build".

- **MAJOR:** muda algo que quebra (ex.: o app antigo deixa de funcionar com a API).
- **MINOR:** funcionalidade nova, compatível com o que já existe.
- **PATCH:** só correções.

O número do build (`buildNumber` no iOS, `versionCode` no Android) é separado e o EAS incrementa sozinho.
Cada versão enviada à loja ganha uma tag no git (`v1.1.0`).

## [1.2.0], em preparação

### Novo
- **Avisos por paciente (grátis):** na ficha de cada paciente, "Receber avisos deste paciente". Cada pessoa decide de quais pacientes recebe o aviso de dose no celular, sem mexer no que os outros recebem. O padrão continua "tudo ligado". A tela Hoje não muda.

### Melhorado
- **Nova rotina e editar rotina, bem mais fáceis:** tudo numa tela só, por toque. Escolha **quantas vezes** (1x, 2x, 3x ao dia, a cada 4 ou 6 h, dia sim/dia não, toda semana ou "Outra…" com contador), a **primeira dose** (agora, próxima hora cheia ou "Escolher o horário" com rodas de hora e minuto e atalhos de manhã/almoço/noite) e **por quanto tempo** (contínuo, 3 a 30 dias ou até uma data). Uma frase e os próximos horários mostram o resultado antes de salvar. "Reprogramar horários" virou "Ajustar se eu atrasar".

- **Calendário próprio na web** (no lugar do campo de data do navegador) e, em telas largas, o horário da primeira dose abre num **diálogo** com calendário, rodas de hora e minuto e atalhos.

### Corrigido
- **Editar a frequência de uma rotina:** agora dá para trocar (por exemplo, de "1 vez ao dia" para "a cada 4 horas") ao editar a rotina de um paciente. Os próximos horários seguem o horário da primeira dose da rotina.

## [1.1.0]

### Novo
- **Oferta de boas-vindas do Medicron Plus:** na primeira vez que uma conta nova chega à tela Hoje, o anual por R$ 59,90 no primeiro ano (depois R$ 89,90). Aparece uma única vez por pessoa; só aparece se a loja de fato oferecer esse preço.
- **Esqueci minha senha:** na tela Entrar, recebe por e-mail um link (vale 1 hora) para criar uma nova senha. As outras sessões da conta saem ao trocar a senha.
- **Pausar paciente:** para quando o tratamento parou por um tempo. Sem lembretes e sem doses na Hoje, a prescrição fica guardada e não conta no limite de pacientes do plano. Retomar continua da próxima dose.

### Melhorado
- **Tela de limites e planos** no mesmo estilo da oferta de boas-vindas: topo em degradê com título conforme o motivo, dois cartões de plano com botão de escolha (anual com "Melhor valor" e a economia, mensal), botão e avisos fixos na base e links de Termos e Privacidade numa frase só.

### Sem build (já publicado no servidor e no site)
- O cron dos lembretes só abre o banco quando há dose a disparar (cache da próxima dose).
- Barra lateral da web sugere o app de iPhone.
- Hotsite com o botão "Baixar na App Store".

## [1.0.0]

Primeira versão na App Store: pacientes (pessoas e pets), itens e rotinas de cuidados, tela Hoje com doses e sequência de dias, lembretes no celular, conta compartilhada em família, widgets e **Medicron Plus** (assinatura mensal ou anual, com 7 dias grátis no anual).
