import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

import { PracticeSession } from "./practice-session";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const session = await getSession();
  if (!session?.user) redirect("/join");

  const consentedAt = (session.user as { consentedAt?: Date | string | null }).consentedAt;
  if (!consentedAt) redirect("/onboarding");

  const showKorean = (session.user as { showKorean?: boolean }).showKorean !== false;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <SiteHeader />
      <PracticeSession showKorean={showKorean} />
    </main>
  );
}
