import { describe, expect, it } from "vitest";

import { practiceStreak, skillBands } from "./progress";

describe("practiceStreak", () => {
  it("counts a run that includes today", () => {
    expect(practiceStreak(["2026-10-23", "2026-10-25", "2026-10-24"], "2026-10-25")).toBe(3);
  });

  it("keeps yesterday's run until today is missed", () => {
    expect(practiceStreak(["2026-10-24"], "2026-10-25")).toBe(1);
    expect(practiceStreak(["2026-10-23"], "2026-10-25")).toBe(0);
  });

  it("crosses a month boundary and ignores duplicates", () => {
    expect(practiceStreak(["2026-10-31", "2026-10-31", "2026-11-01"], "2026-11-01")).toBe(2);
    expect(practiceStreak([], "2026-10-25")).toBe(0);
  });
});

describe("skillBands", () => {
  it("lists every skill and leaves unknown ones empty", () => {
    const bands = skillBands([
      { skill: "grammar", rating: 1150 },
      { skill: "writing", rating: 1250 },
    ]);
    expect(bands.find((row) => row.skill === "grammar")?.band).toBe("B1");
    expect(bands.find((row) => row.skill === "writing")?.band).toBe("B1+");
    expect(bands.find((row) => row.skill === "reading")?.band).toBeNull();
    expect(bands.map((row) => row.skill)).toEqual([
      "grammar",
      "vocabulary",
      "reading",
      "listening",
      "writing",
    ]);
  });
});
