import { createImprovement } from "@/dashboard/runs";
import { withEvolynRequest } from "@/lib/http";
import { parseOptionalId } from "@/lib/validation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return withEvolynRequest(request, async (body) => {
    const traceId = parseOptionalId(body.traceId);
    try {
      const candidate = await createImprovement(traceId);
      return NextResponse.json({ candidate });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Learning failed" },
        { status: 400 },
      );
    }
  });
}
