import type { Item } from "@fluentloop/ai";
import { LEVEL_BANDS, type LevelBand } from "@fluentloop/core";
import { z } from "zod";

import type { CheckResult } from "./checks";

/** E2. The answer key is not in this payload. */
export const mcqSolveSchema = z.object({
  answerIndex: z.number().int().min(0).max(3),
  anotherOptionValid: z.boolean(),
  note: z.string(),
});

/** E3, E4, E5, and E7 for one gold item. */
export const itemJudgeSchema = z.object({
  estimatedLevel: z.enum(LEVEL_BANDS),
  koreanAccurate: z.boolean(),
  naturalEnglish: z.boolean(),
  safe: z.boolean(),
  note: z.string(),
});

export type McqSolve = z.infer<typeof mcqSolveSchema>;
export type ItemJudge = z.infer<typeof itemJudgeSchema>;

/** Bars from docs/PLAN.md §5. A check with no items is not a failure. */
export const JUDGE_BARS = {
  "E2 one correct answer": 0.98,
  "E3 level fit": 0.9,
  "E4 Korean accuracy": 0.95,
  "E5 natural English": 0.9,
  "E7 safety": 1,
} as const;

export type JudgeCheck = keyof typeof JUDGE_BARS;

export function mcqSolveInput(item: Item): string | undefined {
  if (item.type !== "mcq") return undefined;
  return JSON.stringify({
    level: item.level,
    skill: item.skill,
    question: item.question,
    options: item.options,
  });
}

export function itemJudgeInput(item: Item): string {
  if (item.type === "mcq") {
    return JSON.stringify({
      type: item.type,
      level: item.level,
      skill: item.skill,
      question: item.question,
      options: item.options,
      explanation: item.explanation,
    });
  }
  return JSON.stringify(item);
}

export function checksFromJudgement(
  item: Item,
  solve: McqSolve | undefined,
  judgement: ItemJudge,
): CheckResult[] {
  const checks: CheckResult[] = [];
  if (item.type === "mcq" && solve) {
    const passed = solve.answerIndex === item.answerIndex && !solve.anotherOptionValid;
    checks.push({
      check: "E2 one correct answer",
      passed,
      detail: passed
        ? undefined
        : `model chose ${solve.answerIndex}; another valid: ${solve.anotherOptionValid}. ${solve.note}`,
    });
  }
  const levelDistance = Math.abs(bandIndex(judgement.estimatedLevel) - bandIndex(item.level));
  checks.push({
    check: "E3 level fit",
    passed: levelDistance <= 1,
    detail:
      levelDistance <= 1
        ? undefined
        : `labeled ${item.level}, model estimated ${judgement.estimatedLevel}. ${judgement.note}`,
  });
  checks.push(flag("E4 Korean accuracy", judgement.koreanAccurate, judgement.note));
  checks.push(flag("E5 natural English", judgement.naturalEnglish, judgement.note));
  checks.push(flag("E7 safety", judgement.safe, judgement.note));
  return checks;
}

export interface JudgeSummary {
  check: JudgeCheck;
  passed: number;
  total: number;
  bar: number;
  ok: boolean;
}

export function summarizeJudge(rows: readonly CheckResult[][]): JudgeSummary[] {
  const counts = new Map<JudgeCheck, { passed: number; total: number }>();
  for (const row of rows) {
    for (const check of row) {
      if (!isJudgeCheck(check.check)) continue;
      const count = counts.get(check.check) ?? { passed: 0, total: 0 };
      count.total += 1;
      if (check.passed) count.passed += 1;
      counts.set(check.check, count);
    }
  }
  return (Object.keys(JUDGE_BARS) as JudgeCheck[]).flatMap((check) => {
    const count = counts.get(check);
    if (!count || count.total === 0) return [];
    const rate = count.passed / count.total;
    return [{ check, ...count, bar: JUDGE_BARS[check], ok: rate + 1e-9 >= JUDGE_BARS[check] }];
  });
}

function flag(check: JudgeCheck, passed: boolean, note: string): CheckResult {
  return { check, passed, detail: passed ? undefined : note };
}

function bandIndex(band: LevelBand): number {
  return LEVEL_BANDS.indexOf(band);
}

function isJudgeCheck(check: string): check is JudgeCheck {
  return check in JUDGE_BARS;
}
