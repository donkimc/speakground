"use client";

import { Button } from "@fluentloop/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { authClient } from "@/lib/auth-client";

export function SignOutButton({
  size = "md",
  className,
}: {
  size?: "md" | "sm";
  className?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function logOut() {
    setError(null);
    setPending(true);
    try {
      const { error: signOutError } = await authClient.signOut({
        disableRedirect: true,
      });
      if (signOutError) {
        setError(signOutError.message || "Could not log out.");
        setPending(false);
        return;
      }
    } catch {
      setError("Could not log out.");
      setPending(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="ghost"
        size={size}
        className={className}
        disabled={pending}
        onClick={() => void logOut()}
      >
        {pending ? "Logging out…" : "Log out"}
      </Button>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
