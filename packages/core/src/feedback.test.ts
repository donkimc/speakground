import { describe, expect, it } from "vitest";

import { feedbackItemIndex, feedbackKind } from "./feedback";

describe("item feedback", () => {
  it("accepts a question in the set", () => {
    expect(feedbackItemIndex(0)).toBe(0);
    expect(feedbackItemIndex(7)).toBe(7);
  });

  it("rejects an index outside the eight questions", () => {
    expect(feedbackItemIndex(-1)).toBeNull();
    expect(feedbackItemIndex(8)).toBeNull();
    expect(feedbackItemIndex(1.5)).toBeNull();
  });

  it("accepts the three flag kinds", () => {
    expect(feedbackKind("wrong")).toBe("wrong");
    expect(feedbackKind("too-hard")).toBe("too-hard");
    expect(feedbackKind("too-easy")).toBe("too-easy");
    expect(feedbackKind("boring")).toBeNull();
  });
});
