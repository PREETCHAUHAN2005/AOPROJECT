import { promoteCandidate } from "@/dashboard/runs";
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
    const version = await promoteCandidate(candidateId);
    return NextResponse.json({ version });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Promotion failed" },
      { status: 400 },
    );
  }
}
