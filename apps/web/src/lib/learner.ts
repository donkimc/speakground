import { NextResponse } from "next/server";

import { getSession } from "./session";

export async function requireLearner(): Promise<
  { userId: string; showKorean: boolean } | NextResponse
> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }
  const consentedAt = (session.user as { consentedAt?: Date | string | null }).consentedAt;
  if (!consentedAt) {
    return NextResponse.json({ error: "Finish setup before practice." }, { status: 403 });
  }
  const showKorean = (session.user as { showKorean?: boolean }).showKorean !== false;
  return { userId: session.user.id, showKorean };
}
