import { validateCandidate } from "@/dashboard/runs";
import { withEvolynRequest } from "@/lib/http";
import { parseOptionalId } from "@/lib/validation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export function POST(request: Request) {
  return withEvolynRequest(request, async (body) => {
    const candidateId = parseOptionalId(body.candidateId);
    try {
      const benchmark = await validateCandidate(candidateId);
      return NextResponse.json({ benchmark });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Validation failed" },
        { status: 400 },
      );
    }
  });
}
