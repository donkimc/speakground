import type { z } from "zod";

/**
 * Every LLM call goes through this interface so the vendor and model can be
 * swapped by configuration (see docs/PLAN.md §2).
 *
 * - "fast": budget model for high-volume daily generation and grading.
 * - "strong": stronger model for placement, topic packs and QA judging.
 */
export type ModelTier = "fast" | "strong";

export interface StructuredRequest<T extends z.ZodType> {
  tier: ModelTier;
  /** Versioned prompt id, e.g. "daily-mcq@1". Recorded with every generated item. */
  promptId: string;
  system: string;
  input: string;
  schema: T;
  /**
   * How long a reasoning model may think before the JSON answer.
   * Daily generation uses "low" so the answer fits the token budget.
   */
  reasoningEffort?: "low" | "medium" | "high";
  /** Defaults to 0. Practice generation raises this so a retry is not identical. */
  temperature?: number;
}

export interface StructuredResult<T> {
  data: T;
  model: string;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmProvider {
  generateStructured<T extends z.ZodType>(
    request: StructuredRequest<T>,
  ): Promise<StructuredResult<z.infer<T>>>;
}
