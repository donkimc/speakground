import { createGroqProvider, type LlmProvider } from "@fluentloop/ai";

import { isGroqConfigured, loadWebEnv } from "./env";

export function getGroq(): LlmProvider | null {
  const env = loadWebEnv();
  if (!isGroqConfigured(env) || !env.GROQ_API_KEY) return null;
  return createGroqProvider({
    apiKey: env.GROQ_API_KEY,
    fastModel: env.GROQ_FAST_MODEL,
    strongModel: env.GROQ_STRONG_MODEL,
  });
}
