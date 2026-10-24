const INVITE_AGAIN = "Enter your invite code, then continue with Kakao.";

const MESSAGES: Record<string, string> = {
  access_denied: "Kakao sign-in was cancelled. Enter your invite code and try again.",
  email_not_found: "Kakao did not return a profile we can use. Try again.",
  invalid_code: "Kakao sign-in did not complete. Try again.",
  invalid_scope: "Kakao rejected a permission this app requested. Try again.",
  INVITE_REQUIRED: INVITE_AGAIN,
  invite_required: INVITE_AGAIN,
  state_mismatch: "That sign-in expired. Enter your invite code and try Kakao again.",
  state_not_found: "That sign-in expired. Enter your invite code and try Kakao again.",
  unable_to_get_user_info: "Kakao did not return your profile. Try again.",
};

export function explainAuthError(
  code: string | undefined,
  description: string | undefined,
): string | null {
  if (!code) return null;
  const known = MESSAGES[code];
  if (known) return known;
  if (description && /invite/i.test(description)) return INVITE_AGAIN;
  return "Kakao sign-in did not finish. Enter your invite code and try again.";
}
