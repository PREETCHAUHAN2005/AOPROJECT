import { getFoundationState } from "@/dashboard";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const state = getFoundationState();

  return NextResponse.json({
    ok: true,
    product: state.product,
    currentVersion: state.currentVersion.version,
    demoTaskId: state.demoTask.id,
    persistence: state.persistence,
    counts: state.counts,
  });
}
