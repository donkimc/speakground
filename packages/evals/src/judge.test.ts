import type { Item } from "@fluentloop/ai";
import { describe, expect, it } from "vitest";

import { checksFromJudgement, mcqSolveInput, summarizeJudge } from "./judge";

const mcq: Item = {
  type: "mcq",
  level: "B1",
  skill: "grammar",
  tags: [],
  question: "I ___ here since 2020.",
  options: ["live", "have lived", "am living", "lived"],
  answerIndex: 1,
  explanation: {
    en: "Use the present perfect with since.",
    ko: "'since'와 함께 현재완료를 씁니다.",
  },
};

describe("mcqSolveInput", () => {
  it("omits the answer key", () => {
    const input = mcqSolveInput(mcq);
    expect(input).toBeDefined();
    expect(input).not.toContain("answerIndex");
    expect(input).not.toContain("explanation");
  });
});

describe("checksFromJudgement", () => {
  it("passes when the model agrees and the level is within one band", () => {
    const checks = checksFromJudgement(
      mcq,
      { answerIndex: 1, anotherOptionValid: false, note: "ok" },
      {
        estimatedLevel: "B1+",
        koreanAccurate: true,
        naturalEnglish: true,
        safe: true,
        note: "ok",
      },
    );
    expect(checks.every((check) => check.passed)).toBe(true);
  });

  it("fails a second valid option and a level that is too far", () => {
    const checks = checksFromJudgement(
      mcq,
      { answerIndex: 1, anotherOptionValid: true, note: "two answers" },
      {
        estimatedLevel: "C1",
        koreanAccurate: false,
        naturalEnglish: true,
        safe: true,
        note: "too high",
      },
    );
    const failed = checks.filter((check) => !check.passed).map((check) => check.check);
    expect(failed).toEqual(["E2 one correct answer", "E3 level fit", "E4 Korean accuracy"]);
  });
});

describe("summarizeJudge", () => {
  it("applies the plan bars", () => {
    const summary = summarizeJudge([
      [{ check: "E2 one correct answer", passed: true }],
      [{ check: "E2 one correct answer", passed: false }],
      [{ check: "E7 safety", passed: true }],
    ]);
    const e2 = summary.find((row) => row.check === "E2 one correct answer");
    const e7 = summary.find((row) => row.check === "E7 safety");
    expect(e2?.ok).toBe(false);
    expect(e7?.ok).toBe(true);
  });
});
