"use client";

import { Button, Input, KoreanHint, Label } from "@fluentloop/ui";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { authClient } from "@/lib/auth-client";

type Step = "invite" | "sign-in" | "magic-sent";

export function JoinForm({
  initialCode,
  initialStep = "invite",
  authError = null,
  kakaoEnabled,
}: {
  initialCode: string;
  initialStep?: Step;
  authError?: string | null;
  kakaoEnabled: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState<Step>(initialStep);
  const [code, setCode] = useState(initialCode);
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(authError);
  const [pending, startTransition] = useTransition();

  function redeemInvite(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not validate invite.");
        return;
      }
      setStep("sign-in");
    });
  }

  function signInWithKakao() {
    setError(null);
    startTransition(async () => {
      const { error: signInError } = await authClient.signIn.social({
        provider: "kakao",
        callbackURL: "/onboarding",
      });
      if (signInError) {
        setError(signInError.message ?? "Kakao sign-in failed.");
      }
    });
  }

  function sendMagicLink(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error: signInError } = await authClient.signIn.magicLink({
        email,
        callbackURL: "/onboarding",
        newUserCallbackURL: "/onboarding",
      });
      if (signInError) {
        setError(signInError.message ?? "Could not send magic link.");
        return;
      }
      setStep("magic-sent");
    });
  }

  if (step === "magic-sent") {
    return (
      <div className="space-y-3">
        <h1 className="text-2xl font-bold tracking-tight">Check your email</h1>
        <p className="text-muted-foreground">
          We sent a sign-in link to <span className="text-foreground">{email}</span>. Open it on
          this device to continue.
        </p>
        <KoreanHint>이메일로 보낸 링크로 로그인하세요.</KoreanHint>
        <Button type="button" variant="secondary" onClick={() => setStep("sign-in")}>
          Use a different email
        </Button>
      </div>
    );
  }

  if (step === "sign-in") {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">Sign in to join</h1>
          <p className="text-muted-foreground">
            Invite accepted. Continue with Kakao or an email magic link.
          </p>
          <KoreanHint>카카오 또는 이메일 링크로 가입하세요.</KoreanHint>
        </div>

        {error ? (
          <p className="text-sm text-danger" role="alert">
            {error}
          </p>
        ) : null}

        <div className="space-y-3">
          {kakaoEnabled ? (
            <Button type="button" className="w-full" disabled={pending} onClick={signInWithKakao}>
              Continue with Kakao
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Kakao login is not configured yet. Use email for now.
            </p>
          )}

          <form className="space-y-3" onSubmit={sendMagicLink}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
              {pending ? "Sending…" : "Email me a sign-in link"}
            </Button>
          </form>
        </div>

        <button
          type="button"
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          onClick={() => {
            setStep("invite");
            void fetch("/api/invite", { method: "DELETE" });
          }}
        >
          Use a different invite code
        </button>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={redeemInvite}>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Join with an invite</h1>
        <p className="text-muted-foreground">
          SpeakGround is invite-only for the meetup group. Paste the code from the group chat.
        </p>
        <KoreanHint>모임 단톡방에 공유된 초대 코드를 입력하세요.</KoreanHint>
      </div>

      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="code">Invite code</Label>
        <Input
          id="code"
          name="code"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(event) => setCode(event.target.value)}
          placeholder="MEETUP-XXXX"
        />
      </div>

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Continue"}
      </Button>

      <button
        type="button"
        className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => router.push("/")}
      >
        Back to home
      </button>
    </form>
  );
}
