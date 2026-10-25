import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createGroqProvider } from "./groq-provider";

const solveSchema = z.object({
  answerIndex: z.number(),
  anotherOptionValid: z.boolean(),
  note: z.string(),
});

describe("createGroqProvider", () => {
  it("parses a strict JSON schema response", async () => {
    const seen: { url?: string; authorization?: string; model?: string; strict?: boolean } = {};
    const provider = createGroqProvider({
      apiKey: "test-key",
      fastModel: "openai/gpt-oss-20b",
      strongModel: "openai/gpt-oss-120b",
      fetch: async (url, init) => {
        const headers = new Headers(init?.headers);
        const body = JSON.parse(String(init?.body)) as {
          model: string;
          temperature: number;
          response_format: { json_schema: { strict: boolean; schema: { $schema?: string } } };
        };
        seen.url = String(url);
        seen.authorization = headers.get("authorization") ?? undefined;
        seen.model = body.model;
        seen.strict = body.response_format.json_schema.strict;
        expect(body.response_format.json_schema.schema.$schema).toBeUndefined();
        expect("reasoning_effort" in body).toBe(false);
        expect(body.temperature).toBe(0);
        return new Response(
          JSON.stringify({
            model: "openai/gpt-oss-120b",
            choices: [
              {
                message: {
                  content:
                    '```json\n{"answerIndex":1,"anotherOptionValid":false,"note":"present perfect"}\n```',
                },
              },
            ],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
          { status: 200 },
        );
      },
    });

    const result = await provider.generateStructured({
      tier: "strong",
      promptId: "mcq-solve@1",
      system: "test",
      input: "{}",
      schema: solveSchema,
    });

    expect(seen).toEqual({
      url: "https://api.groq.com/openai/v1/chat/completions",
      authorization: "Bearer test-key",
      model: "openai/gpt-oss-120b",
      strict: true,
    });
    expect(result.data).toEqual({
      answerIndex: 1,
      anotherOptionValid: false,
      note: "present perfect",
    });
    expect(result.usage).toEqual({ inputTokens: 10, outputTokens: 5 });
  });

  it("rejects an error response", async () => {
    const provider = createGroqProvider({
      apiKey: "test-key",
      fastModel: "fast",
      strongModel: "strong",
      fetch: async () => new Response("no", { status: 401 }),
    });
    await expect(
      provider.generateStructured({
        tier: "fast",
        promptId: "mcq-solve@1",
        system: "test",
        input: "{}",
        schema: solveSchema,
      }),
    ).rejects.toThrow(/401/);
  });
});
