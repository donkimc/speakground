import { describe, expect, it } from "vitest";

import { inviteCodeFromServerContext, readInviteCodeFromCookieHeader } from "./invite-cookie";

describe("invite cookies", () => {
  it("reads the invite cookie and ignores the others", () => {
    expect(readInviteCodeFromCookieHeader("a=1; fl_invite=meetup-5de115; b=2")).toBe(
      "MEETUP-5DE115",
    );
  });

  it("reads the code stashed for the Kakao round trip", () => {
    expect(inviteCodeFromServerContext({ inviteCode: "meetup-5de115" })).toBe("MEETUP-5DE115");
    expect(inviteCodeFromServerContext(null)).toBeNull();
    expect(inviteCodeFromServerContext({ inviteCode: "" })).toBeNull();
  });
});
