import { getFoundationState } from "@/dashboard";
import { withEvolynRequest } from "@/lib/http";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return withEvolynRequest(
    request,
    async () => {
      try {
        const state = getFoundationState();
        return NextResponse.json({
          ok: true,
          product: state.product,
          currentVersion: state.currentVersion.version,
          persistence: state.persistence,
          persistenceLabel: state.persistenceLabel,
          counts: state.counts,
        });
      } catch {
        return NextResponse.json({
          ok: true,
          product: "Evolyn",
          currentVersion: "v0",
          persistence: "memory",
          persistenceLabel: "In-memory (ephemeral)",
          counts: {},
        });
      }
    },
    { includeSnapshot: false },
  );
}
