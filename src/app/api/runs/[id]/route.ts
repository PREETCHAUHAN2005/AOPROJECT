import { getRunInspection } from "@/learning";
import { withEvolynRequest } from "@/lib/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  return withEvolynRequest(request, async () => {
    const inspection = getRunInspection(id);
    if (!inspection) {
      return NextResponse.json({ error: "Trace not found" }, { status: 404 });
    }
    return NextResponse.json(inspection);
  });
}
