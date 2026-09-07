import { executeTaskByPrompt, listRecentInspections } from "@/dashboard/runs";
import { DEMO_TASK_ID, DEMO_TASK_PROMPT } from "@/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    runs: listRecentInspections(),
  });
}

export async function POST(request: Request) {
  let prompt = DEMO_TASK_PROMPT;

  try {
    const body = (await request.json()) as { taskId?: string; prompt?: string };
    if (body.prompt?.trim()) {
      prompt = body.prompt.trim();
    } else if (body.taskId === DEMO_TASK_ID) {
      prompt = DEMO_TASK_PROMPT;
    }
  } catch {
    prompt = DEMO_TASK_PROMPT;
  }

  try {
    const inspection = await executeTaskByPrompt(prompt);
    return NextResponse.json(inspection);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Task execution failed" },
      { status: 400 },
    );
  }
}
