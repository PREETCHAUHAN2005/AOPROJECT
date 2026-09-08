import { getLearningState } from "@/dashboard/runs";
import { withEvolynRequest } from "@/lib/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withEvolynRequest(request, async () => {
    return NextResponse.json(getLearningState());
  });
}
