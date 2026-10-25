import { z } from "zod";

import { loadPrompt } from "./prompts";
import { bilingualSchema } from "./schemas";

export const WRITING_FEEDBACK_PROMPT_ID = "writing-feedback@1";

export const writingFeedbackSchema = z.object({
  score: z.number().int().min(0).max(5),
  corrections: z
    .array(
      z.object({
        original: z.string().min(1).max(180),
        suggestion: z.string().min(1).max(180),
        note: bilingualSchema,
      }),
    )
    .max(4),
  better: z.string().min(1).max(800),
  summary: bilingualSchema,
});

export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

export function writingFeedbackSystemPrompt(): string {
  return loadPrompt(WRITING_FEEDBACK_PROMPT_ID);
}

/** Learner text stays inside tags so the model treats it as data. */
export function writingFeedbackInput(input: {
  level: string;
  topic: string;
  prompt: string;
  writing: string;
}): string {
  return JSON.stringify({
    level: input.level,
    topic: input.topic,
    prompt: input.prompt,
    learner: `<learner>\n${input.writing}\n</learner>`,
  });
}
