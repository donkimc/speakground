import { KoreanHint } from "@fluentloop/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { requireLearner } from "@/lib/learner";
import { loadProgress } from "@/lib/progress";

export const dynamic = "force-dynamic";

const SKILL_LABEL = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
} as const;

export default async function ProgressPage() {
  const learner = await requireLearner();
  if (learner instanceof Response) {
    redirect(learner.status === 403 ? "/onboarding" : "/join");
  }

  const progress = await loadProgress(learner.userId);
  const streakLabel = progress.streak === 1 ? "1 day" : `${progress.streak} days`;
  const streakNote =
    progress.streak === 0
      ? "Finish a practice to start."
      : progress.practicedToday
        ? "You practiced today."
        : "Practice today to keep it going.";

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-12">
      <SiteHeader />
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Progress</h1>
        <p className="text-muted-foreground">Your streak, levels, and recent misses.</p>
        <KoreanHint>연속 일수, 실력, 최근에 틀린 표현입니다.</KoreanHint>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium text-primary">Streak</h2>
        <p className="text-3xl font-bold tracking-tight">{streakLabel}</p>
        <p className="text-sm text-muted-foreground">{streakNote}</p>
        <KoreanHint>연습을 끝까지 마친 날이 이어집니다.</KoreanHint>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium text-primary">Levels</h2>
        <ul className="space-y-2">
          {progress.skills.map((row) => (
            <li
              key={row.skill}
              className="flex min-h-11 items-center justify-between rounded-lg border border-border bg-card px-4"
            >
              <span>{SKILL_LABEL[row.skill]}</span>
              <span className="font-medium">{row.band ?? "Not yet"}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-sm font-medium text-primary">Recent mistakes</h2>
        {progress.mistakes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Missed phrases show up after practice.</p>
        ) : (
          <ul className="space-y-3">
            {progress.mistakes.map((mistake) => (
              <li
                key={mistake.term}
                className="space-y-1 rounded-lg border border-border bg-card px-4 py-3"
              >
                <p className="font-medium">{mistake.term}</p>
                <p className="text-sm text-muted-foreground">{mistake.example}</p>
              </li>
            ))}
          </ul>
        )}
        <Link href="/notebook" className="inline-block text-sm font-medium text-primary">
          Notebook
        </Link>
      </section>

      <Link href="/" className="mt-8 text-sm font-medium text-primary">
        Back to home
      </Link>
    </main>
  );
}
