import { getDashboardView } from "@/dashboard/view-model";
import { resetDemo } from "@/dashboard/runs";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function POST() {
  resetDemo();
  return NextResponse.json({
    ok: true,
    message: "Demo reset to v0.",
    view: getDashboardView(),
  });
}
