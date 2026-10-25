import type { Item } from "@fluentloop/ai";
import { describe, expect, it } from "vitest";

import { practiceSetProblems, writingFeedbackProblems } from "./practice";

const writing = {
  prompt: "Write three sentences about a trip you want to take.",
  promptKo: "가고 싶은 여행에 대해 세 문장을 쓰세요.",
};

function item(question: string, overrides: Partial<Extract<Item, { type: "mcq" }>> = {}): Item {
  return {
    type: "mcq",
    level: "B1",
    skill: "grammar",
    tags: ["present-simple"],
    question,
    options: ["a", "b", "c", "d"],
    answerIndex: 0,
    explanation: { en: "Use the present simple.", ko: "현재 시제를 씁니다." },
    ...overrides,
  };
}

describe("practiceSetProblems", () => {
  it("accepts eight distinct questions at the requested level", () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      item(`Question ${index} __`, {
        skill: index % 2 === 0 ? "grammar" : "vocabulary",
      }),
    );
    expect(practiceSetProblems("B1", items, writing)).toEqual([]);
  });

  it("rejects a wrong level, duplicate options, and a missing Korean explanation", () => {
    const items = [
      item("Same", {
        level: "C1",
        options: ["a", "a", "b", "c"],
        explanation: { en: "x", ko: "x" },
      }),
    ];
    const problems = practiceSetProblems("B1", items, writing);
    expect(problems.some((problem) => problem.includes("C1"))).toBe(true);
    expect(problems.some((problem) => problem.includes("duplicate"))).toBe(true);
    expect(problems.some((problem) => problem.includes("Hangul"))).toBe(true);
  });

  it("rejects a writing task that is not bilingual", () => {
    const items = Array.from({ length: 8 }, (_, index) =>
      item(`Question ${index} __`, { skill: index % 2 === 0 ? "grammar" : "vocabulary" }),
    );
    const problems = practiceSetProblems("B1", items, {
      prompt: "여행에 대해 쓰세요. Write about a trip please.",
      promptKo: "Write about a trip.",
    });
    expect(problems.some((problem) => problem.includes("English"))).toBe(true);
    expect(problems.some((problem) => problem.includes("Hangul"))).toBe(true);
  });

  it("rejects feedback whose Korean summary has no Hangul", () => {
    const problems = writingFeedbackProblems({
      score: 3,
      corrections: [],
      better: "I want to visit Busan.",
      summary: { en: "Clear and simple.", ko: "Clear." },
    });
    expect(problems).toEqual(["summary Korean needs Hangul"]);
  });
});
