import { runFullLearningCycle } from "@/dashboard/runs";
import { withEvolynRequest } from "@/lib/http";
import { DEMO_TASK_ID } from "@/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function POST(request: Request) {
  return withEvolynRequest(request, async () => {
    try {
      const result = await runFullLearningCycle(DEMO_TASK_ID);
      return NextResponse.json(result);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Learning cycle failed" },
        { status: 400 },
      );
    }
  });
}
