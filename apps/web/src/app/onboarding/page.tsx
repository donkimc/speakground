import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { getSession } from "@/lib/session";

import { OnboardingForm } from "./onboarding-form";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session?.user) {
    redirect("/join");
  }

  const consentedAt = (session.user as { consentedAt?: Date | string | null }).consentedAt;
  if (consentedAt) {
    redirect("/");
  }

  const suggestedName =
    (session.user as { displayName?: string | null }).displayName?.trim() ||
    session.user.name?.trim() ||
    "";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <SiteHeader />
      <OnboardingForm suggestedName={suggestedName} />
    </main>
  );
}
