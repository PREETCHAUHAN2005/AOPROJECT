import { executeTaskByPrompt, listRecentInspections } from "@/dashboard/runs";
import { withEvolynRequest } from "@/lib/http";
import { parsePrompt } from "@/lib/validation";
import { DEMO_TASK_ID, DEMO_TASK_PROMPT } from "@/store";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withEvolynRequest(request, async () => {
    return NextResponse.json({
      runs: listRecentInspections(),
    });
  });
}

export function POST(request: Request) {
  return withEvolynRequest(request, async (body) => {
    let prompt = DEMO_TASK_PROMPT;
    try {
      const parsed = parsePrompt(body.prompt);
      if (parsed) {
        prompt = parsed;
      } else if (body.taskId === DEMO_TASK_ID) {
        prompt = DEMO_TASK_PROMPT;
      }
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid prompt" },
        { status: 400 },
      );
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
  });
}
