import { NextResponse } from "next/server";

import { requireLearner } from "@/lib/learner";
import { loadPractice, practiceErrorMessage } from "@/lib/practice";

export const maxDuration = 60;

export async function GET() {
  try {
    const learner = await requireLearner();
    if (learner instanceof NextResponse) return learner;
    return NextResponse.json(await loadPractice(learner.userId, learner.showKorean));
  } catch (error) {
    console.error("[practice]", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: practiceErrorMessage(error, "Could not load today's practice.") },
      { status: 503 },
    );
  }
}
