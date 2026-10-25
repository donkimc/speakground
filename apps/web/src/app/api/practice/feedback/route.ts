import { NextResponse } from "next/server";
import { z } from "zod";

import { requireLearner } from "@/lib/learner";
import { flagQuestion, practiceErrorMessage } from "@/lib/practice";

const bodySchema = z.object({
  itemIndex: z.number().int(),
  kind: z.string(),
});

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
      return NextResponse.json({ error: "Choose a question flag." }, { status: 400 });
    }

    await flagQuestion(learner.userId, parsed.data.itemIndex, parsed.data.kind);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[practice]", error instanceof Error ? error.message : error);
    const message = practiceErrorMessage(error, "Could not save this flag.");
    const status = message === "Choose a question flag." ? 400 : 503;
    return NextResponse.json({ error: message }, { status });
  }
}
