import { describe, expect, it } from "vitest";

import { explainAuthError } from "./auth-error";

describe("explainAuthError", () => {
  it("says nothing when Kakao did not send an error", () => {
    expect(explainAuthError(undefined, undefined)).toBeNull();
  });

  it("asks for the invite again when sign-up was rejected", () => {
    expect(explainAuthError("INVITE_REQUIRED", "A valid invite code is required to join.")).toMatch(
      /invite code/i,
    );
  });

  it("treats an invite mention as an invite problem", () => {
    expect(
      explainAuthError("FORBIDDEN", "This invite code is invalid or has been used up."),
    ).toMatch(/invite code/i);
  });

  it("uses a generic message for an unknown Kakao error", () => {
    expect(explainAuthError("KOE205", "consent required")).toMatch(/did not finish/i);
  });
});
