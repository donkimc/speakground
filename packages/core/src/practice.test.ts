import { describe, expect, it } from "vitest";

import {
  acceptWriting,
  levelForPractice,
  practiceDate,
  practiceFocus,
  scorePractice,
  spokenQuestion,
  topicForDate,
  writingCredit,
} from "./practice";

describe("practice set", () => {
  it("uses the Korea calendar day", () => {
    expect(practiceDate(new Date("2026-10-24T14:30:00.000Z"))).toBe("2026-10-24");
    expect(practiceDate(new Date("2026-10-24T15:30:00.000Z"))).toBe("2026-10-25");
  });

  it("picks a topic from the day of the month", () => {
    expect(topicForDate("2026-10-01")).toBe("daily-life");
    expect(topicForDate("2026-10-02")).toBe("work");
  });

  it("starts at B1 until placement ratings exist", () => {
    expect(levelForPractice([])).toBe("B1");
    expect(levelForPractice([1250, 1250])).toBe("B1+");
  });

  it("includes grammar and the day's vocabulary", () => {
    const focus = practiceFocus("B1", "travel");
    expect(focus.some((node) => node.skill === "grammar")).toBe(true);
    expect(focus.some((node) => node.skill === "vocabulary" && node.topic === "travel")).toBe(true);
  });

  it("scores only a complete set of choices", () => {
    expect(scorePractice([1, 0], [1, 2])).toEqual({ correct: [true, false], score: 1 });
    expect(scorePractice([1], [4])).toBeNull();
    expect(scorePractice([1], [])).toBeNull();
  });

  it("accepts a short writing and rejects an empty or huge one", () => {
    expect(acceptWriting("  I like trains.  ")).toEqual({ ok: true, text: "I like trains." });
    expect(acceptWriting("   ")).toEqual({ ok: false, reason: "empty" });
    expect(acceptWriting("a".repeat(2001))).toEqual({ ok: false, reason: "long" });
  });

  it("reads a blank aloud as the word blank", () => {
    expect(spokenQuestion("The train is __ than the bus.")).toBe(
      "The train is blank than the bus.",
    );
  });

  it("turns a 0–5 rubric into credit", () => {
    expect(writingCredit(0)).toBe(0);
    expect(writingCredit(5)).toBe(1);
    expect(writingCredit(3)).toBe(0.6);
    expect(writingCredit(3.5)).toBeNull();
    expect(writingCredit(6)).toBeNull();
  });
});
