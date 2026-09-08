import { createHmac, timingSafeEqual } from "node:crypto";
import { EMPTY_DATABASE, type EvolynDatabase } from "@/store/schema";

const MAX_SNAPSHOT_CHARS = 750_000;

interface SnapshotEnvelope {
  v: 1;
  body: string;
  sig?: string;
  unsigned?: boolean;
}

export function isSnapshotSigningEnabled(): boolean {
  return Boolean(process.env.EVOLYN_SESSION_SECRET);
}

export function createSnapshot(db: EvolynDatabase): string {
  const body = JSON.stringify(db);
  const envelope: SnapshotEnvelope = {
    v: 1,
    body,
  };
  const secret = process.env.EVOLYN_SESSION_SECRET;
  if (secret) {
    envelope.sig = sign(body, secret);
  } else {
    envelope.unsigned = true;
  }
  return Buffer.from(JSON.stringify(envelope), "utf8").toString("base64url");
}

export function parseSnapshot(token: unknown): EvolynDatabase | null {
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_SNAPSHOT_CHARS) {
    return null;
  }

  try {
    const envelope = JSON.parse(Buffer.from(token, "base64url").toString("utf8")) as SnapshotEnvelope;
    if (envelope.v !== 1 || typeof envelope.body !== "string") {
      return null;
    }

    const secret = process.env.EVOLYN_SESSION_SECRET;
    if (secret) {
      if (!envelope.sig || !verify(envelope.body, envelope.sig, secret)) {
        return null;
      }
    }

    const parsed = JSON.parse(envelope.body) as EvolynDatabase;
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.versions)) {
      return null;
    }

    return {
      ...EMPTY_DATABASE,
      ...parsed,
      learningEvents: parsed.learningEvents ?? [],
    };
  } catch {
    return null;
  }
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("base64url");
}

function verify(body: string, signature: string, secret: string): boolean {
  const expected = sign(body, secret);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
