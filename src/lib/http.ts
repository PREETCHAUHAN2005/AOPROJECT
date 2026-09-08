import { NextResponse } from "next/server";
import { createSnapshot, isSnapshotSigningEnabled, parseSnapshot } from "@/lib/session-snapshot";
import {
  getPersistenceState,
  hydrateDatabase,
  loadDatabase,
} from "@/store/json-store";
import { getSessionId, runWithStoreAsync } from "@/store/session-context";

import { SESSION_COOKIE } from "@/lib/session-cookie";

export function sessionIdFromRequest(request: Request): string {
  const header = request.headers.get("cookie") ?? "";
  const escaped = SESSION_COOKIE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = header.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (match?.[1]) {
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return "local";
    }
  }
  const forwarded = request.headers.get("x-evolyn-sid")?.trim();
  if (forwarded) {
    return forwarded;
  }
  return "local";
}

export function sameOriginDenied(request: Request): NextResponse | null {
  if (request.method === "GET" || request.method === "HEAD") {
    return null;
  }
  const origin = request.headers.get("origin");
  if (!origin) {
    return null;
  }
  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    return NextResponse.json({ error: "Invalid request URL." }, { status: 400 });
  }
  if (origin !== expected) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }
  return null;
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) {
    return {};
  }
  try {
    const parsed = JSON.parse(text) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("JSON body must be an object.");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

export function sessionPayload() {
  const persistence = getPersistenceState();
  return {
    persistence: persistence.mode,
    persistenceLabel: persistence.label,
    signed: isSnapshotSigningEnabled(),
    snapshot: createSnapshot(loadDatabase()),
  };
}

export function jsonWithSession(data: unknown, init?: { status?: number }): NextResponse {
  const body =
    data && typeof data === "object" && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>), session: sessionPayload() }
      : { data, session: sessionPayload() };
  return NextResponse.json(body, init);
}

export async function withEvolynRequest(
  request: Request,
  handler: (body: Record<string, unknown>) => Promise<Response> | Response,
  options: { includeSnapshot?: boolean } = {},
): Promise<Response> {
  const denied = sameOriginDenied(request);
  if (denied) {
    return denied;
  }

  let body: Record<string, unknown> = {};
  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      body = await readJsonBody(request);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid JSON body." },
        { status: 400 },
      );
    }
  }

  const snapshot = parseSnapshot(body.snapshot);
  const { snapshot: _ignored, ...rest } = body;
  const sessionId = sessionIdFromRequest(request);

  return runWithStoreAsync(sessionId, async () => {
    if (snapshot) {
      hydrateDatabase(snapshot);
    }
    const response = await handler(rest);
    if (options.includeSnapshot === false) {
      return response;
    }
    return attachSession(response);
  });
}

async function attachSession(response: Response): Promise<Response> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return response;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    return response;
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? { ...(data as Record<string, unknown>), session: sessionPayload() }
      : { data, session: sessionPayload() };

  return NextResponse.json(payload, { status: response.status });
}

export function currentSessionId(): string {
  return getSessionId();
}
