import { NextResponse } from "next/server";
import { z } from "zod";

import { requireLearner } from "@/lib/learner";
import { gradeNotebook } from "@/lib/notebook";

const bodySchema = z.object({
  id: z.string().min(1).max(80),
  grade: z.enum(["again", "good"]),
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
      return NextResponse.json({ error: "Choose again or got it." }, { status: 400 });
    }

    const saved = await gradeNotebook(learner.userId, parsed.data.id, parsed.data.grade);
    if (!saved)
      return NextResponse.json({ error: "That phrase is not in your notebook." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[notebook]", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: "Could not save this review." }, { status: 503 });
  }
}
