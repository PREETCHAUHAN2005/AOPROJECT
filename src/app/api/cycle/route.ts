import { runFullLearningCycle } from "@/dashboard/runs";
import { DEMO_TASK_ID } from "@/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const result = await runFullLearningCycle(DEMO_TASK_ID);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Learning cycle failed" },
      { status: 400 },
    );
  }
}
