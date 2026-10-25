import { KoreanHint } from "@fluentloop/ui";
import Link from "next/link";
import { redirect } from "next/navigation";

import { requireLearner } from "@/lib/learner";
import { loadNotebook } from "@/lib/notebook";

import { NotebookList } from "./notebook-list";

export const dynamic = "force-dynamic";

export default async function NotebookPage() {
  const learner = await requireLearner();
  if (learner instanceof Response) {
    redirect(learner.status === 403 ? "/onboarding" : "/join");
  }

  let entries: Awaited<ReturnType<typeof loadNotebook>> = [];
  try {
    entries = await loadNotebook(learner.userId);
  } catch (error) {
    console.error("[notebook]", error instanceof Error ? error.message : error);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 py-12">
      <p className="mb-6 text-sm font-semibold tracking-wide text-primary uppercase">SpeakGround</p>
      <div className="mb-8 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">Notebook</h1>
        <p className="text-muted-foreground">Phrases from answers you missed, ready to review.</p>
        <KoreanHint>틀린 문제에서 나온 표현이 여기에 모입니다.</KoreanHint>
      </div>
      {entries.length === 0 ? (
        <p className="text-muted-foreground">
          Nothing saved yet. Finish today&apos;s practice first.
        </p>
      ) : (
        <NotebookList entries={entries} />
      )}
      <Link href="/" className="mt-8 text-sm font-medium text-primary">
        Back to home
      </Link>
    </main>
  );
}
