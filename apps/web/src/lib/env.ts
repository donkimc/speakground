import { z } from "zod";

/**
 * Web app env, validated at first use so misconfiguration fails loudly.
 * Kakao and Resend are optional until those accounts are registered.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.url(),
  KAKAO_CLIENT_ID: z.string().min(1).optional(),
  KAKAO_CLIENT_SECRET: z.string().min(1).optional(),
  RESEND_API_KEY: z.string().min(1).optional(),
  EMAIL_FROM: z.string().email().default("SpeakGround <onboarding@resend.dev>"),
  GROQ_API_KEY: z.string().min(1).optional(),
  GROQ_FAST_MODEL: z.string().min(1).default("openai/gpt-oss-20b"),
  GROQ_STRONG_MODEL: z.string().min(1).default("openai/gpt-oss-120b"),
});

export type WebEnv = z.infer<typeof envSchema>;

type EnvSource = Record<string, string | undefined>;

let cached: WebEnv | undefined;

export function loadWebEnv(source: EnvSource = process.env): WebEnv {
  if (cached && source === process.env) return cached;
  const parsed = envSchema.parse(source);
  if (source === process.env) cached = parsed;
  return parsed;
}

export function isKakaoConfigured(env: WebEnv = loadWebEnv()): boolean {
  return Boolean(env.KAKAO_CLIENT_ID && env.KAKAO_CLIENT_SECRET);
}

export function isGroqConfigured(env: WebEnv = loadWebEnv()): boolean {
  return Boolean(env.GROQ_API_KEY);
}
