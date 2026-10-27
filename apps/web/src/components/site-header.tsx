import { SignOutButton } from "@/components/sign-out-button";

export function SiteHeader() {
  return (
    <header className="mb-6 flex min-h-11 items-center justify-between gap-3">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">SpeakGround</p>
      <SignOutButton size="sm" />
    </header>
  );
}
