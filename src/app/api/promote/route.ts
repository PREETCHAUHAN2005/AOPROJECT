import { promoteCandidate } from "@/dashboard/runs";
import { withEvolynRequest } from "@/lib/http";
import { parseOptionalId } from "@/lib/validation";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST(request: Request) {
  return withEvolynRequest(request, async (body) => {
    const candidateId = parseOptionalId(body.candidateId);
    try {
      const version = await promoteCandidate(candidateId);
      return NextResponse.json({ version });
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Promotion failed" },
        { status: 400 },
      );
    }
  });
}
