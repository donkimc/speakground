import { describe, expect, it } from "vitest";

import {
  entriesFromCorrections,
  entriesFromMisses,
  initialReview,
  scheduleReview,
} from "./notebook";

const missed = {
  question: "The train is __ than the bus.",
  options: ["cheap", "cheaper", "cheapest", "more cheap"],
  answerIndex: 1,
  explanation: { ko: "둘을 비교할 때는 cheaper를 씁니다." },
};

describe("notebook entries", () => {
  it("keeps the correct option from a missed question", () => {
    expect(entriesFromMisses([missed], [false])).toEqual([
      {
        term: "cheaper",
        meaningKo: "둘을 비교할 때는 cheaper를 씁니다.",
        example: "The train is cheaper than the bus.",
      },
    ]);
  });

  it("skips correct answers and repeated terms", () => {
    const entries = entriesFromMisses(
      [missed, { ...missed, question: "This ticket is __." }],
      [true, false],
    );
    expect(entries).toHaveLength(1);
    expect(entriesFromMisses([missed, missed], [false, false])).toHaveLength(1);
  });

  it("saves a writing suggestion once", () => {
    expect(
      entriesFromCorrections([
        { suggestion: "I want to go", note: { ko: "want 뒤에는 to가 필요합니다." } },
        { suggestion: "I want to go", note: { ko: "같은 표현입니다." } },
      ]),
    ).toEqual([
      {
        term: "I want to go",
        meaningKo: "want 뒤에는 to가 필요합니다.",
        example: "I want to go",
      },
    ]);
  });
});

describe("notebook schedule", () => {
  it("waits a day before the first review", () => {
    expect(initialReview("2026-10-31")).toEqual({ intervalDays: 1, dueOn: "2026-11-01" });
  });

  it("brings a miss back tomorrow and spaces a success", () => {
    expect(scheduleReview(7, "again", "2026-10-25")).toEqual({
      intervalDays: 1,
      dueOn: "2026-10-26",
    });
    expect(scheduleReview(1, "good", "2026-10-25")).toEqual({
      intervalDays: 3,
      dueOn: "2026-10-28",
    });
    expect(scheduleReview(30, "good", "2026-10-25").intervalDays).toBe(30);
  });
});
