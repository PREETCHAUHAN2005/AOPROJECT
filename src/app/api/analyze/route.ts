import { analyzeExistingTrace } from "@/dashboard/runs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let traceId: string | undefined;

  try {
    const body = (await request.json()) as { traceId?: string };
    traceId = body.traceId;
  } catch {
    traceId = undefined;
  }

  try {
    const inspection = await analyzeExistingTrace(traceId);
    return NextResponse.json(inspection);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Analyze failed" },
      { status: 400 },
    );
  }
}
