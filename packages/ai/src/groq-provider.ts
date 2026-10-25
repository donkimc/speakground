import { toJSONSchema, type z } from "zod";

import type { LlmProvider, StructuredRequest, StructuredResult } from "./provider";

const CHAT_URL = "https://api.groq.com/openai/v1/chat/completions";

/**
 * Groq's OpenAI-compatible chat API behind LlmProvider.
 * Model ids are configuration. gpt-oss 120B is the QA model; 20B is the budget model.
 */
export function createGroqProvider(options: {
  apiKey: string;
  fastModel: string;
  strongModel: string;
  fetch?: typeof fetch;
}): LlmProvider {
  const call = options.fetch ?? fetch;
  return {
    async generateStructured<T extends z.ZodType>(
      request: StructuredRequest<T>,
    ): Promise<StructuredResult<z.infer<T>>> {
      const model = request.tier === "strong" ? options.strongModel : options.fastModel;
      const schema = toJSONSchema(request.schema) as { $schema?: string };
      delete schema.$schema;
      let response: Response | undefined;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        response = await call(CHAT_URL, {
          method: "POST",
          headers: {
            authorization: `Bearer ${options.apiKey}`,
            "content-type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: request.temperature ?? 0,
            max_tokens: 8000,
            ...(request.reasoningEffort ? { reasoning_effort: request.reasoningEffort } : {}),
            messages: [
              { role: "system", content: request.system },
              { role: "user", content: request.input },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: request.promptId.replace(/[^A-Za-z0-9_-]/g, "_"),
                strict: true,
                schema,
              },
            },
          }),
        });
        if (response.status !== 429 || attempt === 1) break;
        const retryAfter = Number(response.headers.get("retry-after"));
        const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000;
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      if (!response?.ok) {
        const detail = response ? (await response.text()).slice(0, 500) : "no response";
        throw new Error(`Groq request failed (${response?.status ?? "no response"}): ${detail}`);
      }
      const body = (await response.json()) as {
        model?: string;
        choices?: { message?: { content?: string | null } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = body.choices?.[0]?.message?.content;
      if (!text) throw new Error("Groq returned no text.");
      const data = request.schema.parse(parseJsonContent(text));
      return {
        data,
        model: body.model ?? model,
        usage: {
          inputTokens: body.usage?.prompt_tokens ?? 0,
          outputTokens: body.usage?.completion_tokens ?? 0,
        },
      };
    },
  };
}

function parseJsonContent(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = (fenced?.[1] ?? text).trim();
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end <= start)
    throw new Error("Groq returned text that is not a JSON object.");
  return JSON.parse(body.slice(start, end + 1));
}
