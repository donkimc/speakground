import { normalizeInviteCode } from "@fluentloop/db";

export const INVITE_COOKIE = "fl_invite";

const INVITE_MAX_AGE_SECONDS = 60 * 60; // 1 hour to finish sign-up

export function inviteCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/",
    maxAge: INVITE_MAX_AGE_SECONDS,
  };
}

export function readInviteCodeFromCookieHeader(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [rawName, ...rest] = part.trim().split("=");
    if (rawName !== INVITE_COOKIE) continue;
    const value = decodeURIComponent(rest.join("="));
    return value ? normalizeInviteCode(value) : null;
  }
  return null;
}

/** Invite code stashed in the OAuth state when Kakao sign-in starts. */
export function inviteCodeFromServerContext(serverContext: unknown): string | null {
  if (!serverContext || typeof serverContext !== "object") return null;
  const code = (serverContext as { inviteCode?: unknown }).inviteCode;
  if (typeof code !== "string" || !code) return null;
  return normalizeInviteCode(code);
}
