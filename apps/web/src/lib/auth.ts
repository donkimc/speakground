import { consumeInvite, findValidInvite, schema } from "@fluentloop/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import {
  addOAuthServerContext,
  APIError,
  createAuthMiddleware,
  getOAuthState,
} from "better-auth/api";
import { magicLink } from "better-auth/plugins";
import { Resend } from "resend";

import { getDb } from "./db";
import { isKakaoConfigured, loadWebEnv, type WebEnv } from "./env";
import { inviteCodeFromServerContext, readInviteCodeFromCookieHeader } from "./invite-cookie";

function cookieHeaderFromCtx(ctx: unknown): string | null {
  if (!ctx || typeof ctx !== "object") return null;
  const record = ctx as {
    headers?: Headers | { get?: (name: string) => string | null };
    request?: { headers?: Headers };
  };
  if (record.headers && typeof record.headers.get === "function") {
    return record.headers.get("cookie");
  }
  if (record.request?.headers && typeof record.request.headers.get === "function") {
    return record.request.headers.get("cookie");
  }
  return null;
}

async function inviteCodeForSignUp(ctx: unknown): Promise<string | null> {
  const fromCookie = readInviteCodeFromCookieHeader(cookieHeaderFromCtx(ctx));
  if (fromCookie) return fromCookie;
  try {
    const state = await getOAuthState();
    return inviteCodeFromServerContext(state?.serverContext);
  } catch {
    return null;
  }
}

async function sendMagicLinkEmail(email: string, url: string, env: WebEnv): Promise<void> {
  if (env.NODE_ENV === "development" || !env.RESEND_API_KEY) {
    console.info(`[magic-link] ${email}: ${url}`);
    if (!env.RESEND_API_KEY) return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  const result = await resend.emails.send({
    from: env.EMAIL_FROM,
    to: email,
    subject: "Your SpeakGround sign-in link",
    text: `Sign in to SpeakGround:\n\n${url}\n\nThis link expires in a few minutes.`,
  });
  if (result.error) {
    throw new Error(result.error.message);
  }
}

function createAuth() {
  const env = loadWebEnv();
  const kakaoId = env.KAKAO_CLIENT_ID;
  const kakaoSecret = env.KAKAO_CLIENT_SECRET;

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    onAPIError: {
      errorURL: `${env.BETTER_AUTH_URL}/join`,
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        const path = ctx.path ?? "";
        if (path !== "/sign-in/social" && !path.endsWith("/sign-in/social")) return;
        const code = readInviteCodeFromCookieHeader(ctx.headers?.get("cookie") ?? null);
        if (!code) return;
        const invite = await findValidInvite(getDb(), code);
        if (!invite) return;
        // The browser may not send the invite cookie on Kakao's cross-site return.
        await addOAuthServerContext({ inviteCode: invite.code });
      }),
    },
    database: drizzleAdapter(getDb(), {
      provider: "pg",
      schema,
    }),
    user: {
      additionalFields: {
        displayName: {
          type: "string",
          required: false,
          input: true,
        },
        consentedAt: {
          type: "date",
          required: false,
          input: false,
        },
        showKorean: {
          type: "boolean",
          required: false,
          defaultValue: true,
          input: true,
        },
        leaderboardOptIn: {
          type: "boolean",
          required: false,
          defaultValue: false,
          input: true,
        },
        inviteCodeUsed: {
          type: "string",
          required: false,
          input: false,
        },
      },
    },
    socialProviders:
      isKakaoConfigured(env) && kakaoId && kakaoSecret
        ? {
            kakao: {
              clientId: kakaoId,
              clientSecret: kakaoSecret,
              // Default scopes include account_email, which non-Biz apps reject.
              disableDefaultScope: true,
              scope: ["profile_nickname"],
              // Non-Biz Kakao apps often omit email; keep a stable non-routable address.
              mapProfileToUser: (profile: {
                id: number | string;
                properties?: { nickname?: string };
                kakao_account?: { email?: string };
              }) => {
                const id = String(profile.id);
                const email =
                  profile.kakao_account?.email ?? `kakao_${id}@users.speakground.invalid`;
                return {
                  name: profile.properties?.nickname ?? "Learner",
                  email,
                  emailVerified: Boolean(profile.kakao_account?.email),
                };
              },
            },
          }
        : {},
    databaseHooks: {
      user: {
        create: {
          before: async (user, ctx) => {
            const code = await inviteCodeForSignUp(ctx);
            if (!code) {
              console.error("[auth] sign-up blocked: no invite code on the request");
              throw new APIError("FORBIDDEN", {
                message: "A valid invite code is required to join.",
                code: "INVITE_REQUIRED",
              });
            }
            const invite = await findValidInvite(getDb(), code);
            if (!invite) {
              throw new APIError("FORBIDDEN", {
                message: "This invite code is invalid or has been used up.",
                code: "INVITE_REQUIRED",
              });
            }
            return {
              data: {
                ...user,
                inviteCodeUsed: invite.code,
              },
            };
          },
          after: async (user) => {
            const code = (user as { inviteCodeUsed?: string | null }).inviteCodeUsed;
            if (!code) return;
            await consumeInvite(getDb(), code);
          },
        },
      },
    },
    plugins: [
      magicLink({
        sendMagicLink: async ({ email, url }) => {
          await sendMagicLinkEmail(email, url, env);
        },
      }),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;

const globalForAuth = globalThis as typeof globalThis & { __fluentloopAuth?: Auth };

export function getAuth(): Auth {
  if (!globalForAuth.__fluentloopAuth) {
    globalForAuth.__fluentloopAuth = createAuth();
  }
  return globalForAuth.__fluentloopAuth;
}
