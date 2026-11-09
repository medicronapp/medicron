import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { organization } from "better-auth/plugins";
import { expo } from "@better-auth/expo";
import { getDb, type Db } from "@/lib/db";
import * as schema from "@/lib/db/schema";
import { purgeUserData } from "@/lib/services/account-deletion";

// Esquema de links do app nativo (identificador app.medicron) e domínios de produção.
const APP_ORIGINS = ["medicron://", "medicron://*", "https://medicron.com.br", "https://www.medicron.com.br"];

type Options = {
  baseURL?: string;
  secret?: string;
  /** `nextCookies()` exige contexto de requisição do Next; os testes passam `false`. */
  withNextCookies?: boolean;
  /** Origens extras (ex.: `exp://` do Expo em desenvolvimento). Também lidas de EXTRA_TRUSTED_ORIGINS (separadas por vírgula). */
  extraTrustedOrigins?: string[];
};

export function createAuth(db: Db, opts: Options = {}) {
  const fromEnv = (process.env.EXTRA_TRUSTED_ORIGINS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  return betterAuth({
    ...(opts.baseURL ? { baseURL: opts.baseURL } : {}),
    ...(opts.secret ? { secret: opts.secret } : {}),
    database: drizzleAdapter(db, { provider: "pg", schema }),
    emailAndPassword: { enabled: true, minPasswordLength: 8 },
    user: {
      // Exclusão de conta (exigida pelas lojas): com a senha, apaga/repassa os dados do app e depois o usuário.
      deleteUser: {
        enabled: true,
        beforeDelete: async (u) => {
          await purgeUserData(db, u.id);
        },
      },
    },
    hooks: {
      // O `better-auth` só confere a senha quando ela vem no corpo; sem ela aceitaria uma sessão recente. Aqui a senha é obrigatória.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/delete-user") {
          const password = (ctx.body as { password?: unknown } | undefined)?.password;
          if (typeof password !== "string" || !password) {
            throw new APIError("BAD_REQUEST", { message: "Informe a senha para excluir a conta." });
          }
        }
      }),
    },
    trustedOrigins: [...APP_ORIGINS, ...fromEnv, ...(opts.extraTrustedOrigins ?? [])],
    plugins: [
      organization({
        allowUserToCreateOrganization: true,
        invitationExpiresIn: 60 * 60 * 24 * 7,
      }),
      expo(),
      ...(opts.withNextCookies === false ? [] : [nextCookies()]),
    ],
  });
}

export const auth = createAuth(getDb());
