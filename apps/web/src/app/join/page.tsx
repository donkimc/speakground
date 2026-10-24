import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { explainAuthError } from "@/lib/auth-error";
import { isKakaoConfigured, loadWebEnv } from "@/lib/env";
import { INVITE_COOKIE } from "@/lib/invite-cookie";
import { getSession } from "@/lib/session";

import { JoinForm } from "./join-form";

export const dynamic = "force-dynamic";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; error?: string; error_description?: string }>;
}) {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }
  if (session?.user) {
    const consentedAt = (session.user as { consentedAt?: Date | string | null }).consentedAt;
    redirect(consentedAt ? "/" : "/onboarding");
  }

  const params = await searchParams;
  const jar = await cookies();
  const inviteReady = Boolean(jar.get(INVITE_COOKIE)?.value);
  const authError = explainAuthError(params.error, params.error_description);
  let kakaoEnabled = false;
  try {
    kakaoEnabled = isKakaoConfigured(loadWebEnv());
  } catch {
    kakaoEnabled = false;
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <p className="mb-6 text-sm font-semibold tracking-wide text-primary uppercase">SpeakGround</p>
      <JoinForm
        initialCode={params.code?.trim() ?? ""}
        initialStep={inviteReady ? "sign-in" : "invite"}
        authError={authError}
        kakaoEnabled={kakaoEnabled}
      />
    </main>
  );
}
