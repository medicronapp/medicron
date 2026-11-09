# Push nativo: configuração e verificação

O código do push nativo (Plano 4) está pronto e testado. Falta o que depende de contas e do banco de produção. Siga **na ordem**.

## 1. Aplicar a migração `0008` (cria a tabela `push_devices`)

É aditiva (só `CREATE TABLE`). **Aplique antes de publicar a API**: o envio de lembretes passa a consultar essa tabela.

```bash
cd apps/api && node --env-file=.env.local ../../node_modules/drizzle-kit/bin.cjs migrate
```

Conferir: a saída deve terminar sem erro. (Opcional) `select count(*) from push_devices;` deve devolver 0.

## 2. Criar o projeto no Expo/EAS

```bash
cd apps/app
npx eas-cli login
npx eas-cli init          # cria o projeto e escreve extra.eas.projectId no app.json
```

Confira que `apps/app/app.json` ficou com `expo.extra.eas.projectId` preenchido e **commite** essa mudança. Sem `projectId` o app mostra "Notificações indisponíveis nesta versão do app" ao tentar ativar.

## 3. Chaves de push

- **iPhone (APNs):** no Apple Developer, *Certificates, Identifiers & Profiles → Keys → +*, marque *Apple Push Notifications service (APNs)*, baixe a chave `.p8` e anote o *Key ID* e o *Team ID*. Envie ao EAS: `npx eas-cli credentials` → iOS → *Push Notifications* → *Add a new push key*.
- **Android (FCM v1):** no Firebase Console crie um projeto, adicione o app Android com o pacote `app.medicron` e baixe o `google-services.json` (guarde fora do Git ou como arquivo secreto do EAS). Em *Configurações → Contas de serviço* gere a chave privada (JSON) e envie ao EAS: `npx eas-cli credentials` → Android → *Google Service Account Key for Push Notifications (FCM V1)*.

## 4. (Opcional) Token de acesso do Expo

Para exigir autenticação nas chamadas ao serviço de push, gere um token em *expo.dev → Account Settings → Access Tokens* e guarde como `EXPO_ACCESS_TOKEN` na Vercel (Production). Sem ele o envio funciona igual.

## 5. Publicar a API (somente depois do passo 1)

```bash
vercel --prod --yes
```

Conferir: `https://medicron.com.br/api/v1/config` responde e `POST /api/v1/push/devices` sem sessão devolve 401.

## 6. Build para aparelho real

O Expo Go não recebe push remoto no Android e tem limites no iPhone. Para testar de verdade use um build de desenvolvimento ou de teste interno:

```bash
cd apps/app
npx eas-cli build --profile development --platform ios      # ou android
```

## 7. Checklist de teste em aparelho real

1. Entrar no app → na tela **Hoje** aparece "Receba avisos no celular" → **Ativar** → aceitar a permissão do sistema → o cartão some da Hoje e a **Conta** mostra "Notificações ativadas".
2. No banco: `select user_id, platform from push_devices;` mostra o aparelho.
3. Criar uma rotina com a primeira dose para daqui a poucos minutos, **fechar o app** e esperar o cron (a cada poucos minutos): chega **"Hora do cuidado"** com "Paciente — Item (dose)".
4. **Tocar na notificação** com o app fechado → abre o app na Hoje. Repetir com o app em segundo plano e aberto.
5. Registrar a dose em outro aparelho/na web: não chega segundo lembrete para o mesmo horário.
6. **Desativar** na Conta → o aparelho some de `push_devices` e para de receber.
7. **Sair da conta** → o aparelho some de `push_devices`; entrar com **outra** pessoa no mesmo aparelho e ativar → o aparelho passa a ser dela (e a primeira não recebe mais).
8. Negar a permissão do sistema → o cartão mostra "As notificações estão bloqueadas…" e **Abrir configurações** leva às configurações do aparelho.
9. Quem usa o site (Web Push) continua recebendo normalmente.
