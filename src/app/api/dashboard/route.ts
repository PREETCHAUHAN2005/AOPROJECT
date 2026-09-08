import { getDashboardView } from "@/dashboard/view-model";
import { withEvolynRequest } from "@/lib/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withEvolynRequest(request, async () => {
    return NextResponse.json(getDashboardView());
  });
}

export function POST(request: Request) {
  return withEvolynRequest(request, async () => {
    return NextResponse.json(getDashboardView());
  });
}
