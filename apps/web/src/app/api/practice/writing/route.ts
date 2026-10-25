import { NextResponse } from "next/server";
import { z } from "zod";

import { requireLearner } from "@/lib/learner";
import { practiceErrorMessage, submitWriting } from "@/lib/practice";

const bodySchema = z.object({
  writing: z.string(),
});

export const maxDuration = 60;

const CLIENT_ERRORS = new Set([
  "Finish the questions before writing.",
  "Write a short answer before continuing.",
  "Keep the answer under 2000 characters.",
]);

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

    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Write a short answer before continuing." },
        { status: 400 },
      );
    }

    return NextResponse.json(
      await submitWriting(learner.userId, learner.showKorean, parsed.data.writing),
    );
  } catch (error) {
    console.error("[practice]", error instanceof Error ? error.message : error);
    const message = practiceErrorMessage(error, "Could not review today's writing. Try again.");
    const status = CLIENT_ERRORS.has(message) ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
