import assert from "node:assert/strict";

const BASE = "http://localhost:3000";

async function post<T>(path: string, body: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error ?? `${path} failed`);
  }
  return payload;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${path} failed`);
  }
  return (await response.json()) as T;
}

async function main() {
  await post("/api/demo/reset");
  const clean = await get<{ status: { version: { version: string }; tasksExecuted: number } }>("/api/dashboard");
  assert.equal(clean.status.version.version, "v0");
  assert.equal(clean.status.tasksExecuted, 0);

  const before = await post<{
    trace: { toolCalls: { tool: string }[]; id: string };
    evaluation: { overall: number } | null;
    failures: { classification: string }[];
  }>("/api/runs", {});
  assert.deepEqual(
    before.trace.toolCalls.map((call) => call.tool),
    ["slack", "crm", "order_api", "knowledge_base"],
  );
  assert.ok(before.evaluation);
  assert.ok(before.failures.some((failure) => failure.classification === "tool_ordering"));

  const learned = await post<{ candidate: { id: string; recommendation: string } }>("/api/learn", {
    traceId: before.trace.id,
  });
  assert.equal(learned.candidate.recommendation, "query order_api first");

  const validated = await post<{ benchmark: { oldScore: number; newScore: number } }>("/api/validate", {
    candidateId: learned.candidate.id,
  });
  assert.ok(validated.benchmark.newScore > validated.benchmark.oldScore);

  const promoted = await post<{ version: { version: string } }>("/api/promote", {
    candidateId: learned.candidate.id,
  });
  assert.equal(promoted.version.version, "v1");

  const after = await post<{ trace: { toolCalls: { tool: string }[] } }>("/api/runs", {});
  assert.deepEqual(
    after.trace.toolCalls.map((call) => call.tool),
    ["order_api", "crm", "knowledge_base"],
  );

  const dash = await get<{
    status: { version: { version: string }; learningStatus: string };
    before: { score: number } | null;
    after: { score: number } | null;
    promotionBanner: { title: string } | null;
  }>("/api/dashboard");
  assert.equal(dash.status.version.version, "v1");
  assert.equal(dash.status.learningStatus, "Policy promoted");
  assert.ok(dash.before && dash.after && dash.after.score > dash.before.score);
  assert.equal(dash.promotionBanner?.title, "New policy promoted");

  console.log("HTTP demo flow passed against the running app.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
