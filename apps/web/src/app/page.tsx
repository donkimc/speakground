import { Button, KoreanHint } from "@fluentloop/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SignOutButton } from "@/components/sign-out-button";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; error_description?: string }>;
}) {
  let session: Awaited<ReturnType<typeof getSession>> = null;
  try {
    session = await getSession();
  } catch {
    session = null;
  }

  const params = await searchParams;
  if (!session?.user && params.error) {
    const next = new URLSearchParams();
    next.set("error", params.error);
    if (params.error_description) next.set("error_description", params.error_description);
    redirect(`/join?${next.toString()}`);
  }

  const consentedAt = session
    ? (session.user as { consentedAt?: Date | string | null }).consentedAt
    : null;
  const displayName =
    session &&
    ((session.user as { displayName?: string | null }).displayName?.trim() ||
      session.user.name?.trim());

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4 py-12">
      <div className="space-y-2">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">SpeakGround</p>
        <h1 className="text-3xl font-bold tracking-tight">Your daily English, at your level.</h1>
        <p className="text-muted-foreground">
          Five to ten minutes a day, built around this week&apos;s meetup topic.
        </p>
        <KoreanHint>매일 5~10분, 내 수준에 맞춘 영어 학습.</KoreanHint>
      </div>

      {session && consentedAt ? (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium text-foreground">{displayName}</span>.
          </p>
          <Button asChild className="w-full">
            <Link href="/practice">Today&apos;s practice</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/notebook">Notebook</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/progress">Progress</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/placement">Placement test</Link>
          </Button>
          <SignOutButton className="w-full" />
        </div>
      ) : session ? (
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/onboarding">Finish setup</Link>
          </Button>
          <SignOutButton className="w-full" />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/join">Join with invite</Link>
          </Button>
          <Button asChild variant="secondary" className="w-full">
            <Link href="/join?intent=login">Log in</Link>
          </Button>
          <KoreanHint>처음이면 초대 코드가 필요해요. 계정이 있으면 로그인하세요.</KoreanHint>
        </div>
      )}
    </main>
  );
}
