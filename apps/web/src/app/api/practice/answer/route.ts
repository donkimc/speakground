import { NextResponse } from "next/server";

import { requireLearner } from "@/lib/learner";
import { practiceAnswerSchema, practiceErrorMessage, submitPractice } from "@/lib/practice";

export async function POST(request: Request) {
  try {
    const learner = await requireLearner();
    if (learner instanceof NextResponse) return learner;

    let json: unknown;
    try {
      json = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const parsed = practiceAnswerSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: "Choose an answer for every question." }, { status: 400 });
    }

    return NextResponse.json(
      await submitPractice(learner.userId, learner.showKorean, parsed.data.answers),
    );
  } catch (error) {
    console.error("[practice]", error instanceof Error ? error.message : error);
    const message = practiceErrorMessage(error, "Could not score today's practice.");
    const status = message === "Choose an answer for every question." ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
