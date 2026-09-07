import { validateCandidate } from "@/dashboard/runs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let candidateId: string | undefined;
  try {
    const body = (await request.json()) as { candidateId?: string };
    candidateId = body.candidateId;
  } catch {
    candidateId = undefined;
  }

  try {
    const benchmark = await validateCandidate(candidateId);
    return NextResponse.json({ benchmark });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Validation failed" },
      { status: 400 },
    );
  }
}
