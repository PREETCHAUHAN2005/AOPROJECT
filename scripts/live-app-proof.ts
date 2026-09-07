import assert from "node:assert/strict";
import { createAgentRuntime } from "../src/agent/runtime";
import { createPlanner } from "../src/agent/planner";
import { createToolSelector } from "../src/agent/tool-selector";
import { createSimpleCostTracker } from "../src/telemetry";
import { DEMO_TASK_ID, V0_VERSION_ID, store } from "../src/store";

const BASE = "http://localhost:3000";

async function post<T>(path: string, body: Record<string, string> = {}): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(`${path} ${response.status}: ${payload.error ?? "failed"}`);
  }
  return payload;
}

async function get<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${path} ${response.status}`);
  }
  return (await response.json()) as T;
}

function tools(trace: { toolCalls: { tool: string }[] }): string {
  return trace.toolCalls.map((call) => call.tool).join(" → ");
}

async function main() {
  console.log("=== LIVE APP PROOF against", BASE, "===\n");

  const page = await fetch(`${BASE}/`);
  const html = await page.text();
  assert.equal(page.status, 200);
  assert.match(html, /Evolyn/);
  assert.match(html, /Run Task/);
  assert.match(html, /Promote Policy/);
  console.log("0. GET /  ", page.status, "  Evolyn UI served:", html.includes("Evolyn"));

  const health = await get<{ ok: boolean; product: string; currentVersion: string }>(
    "/api/health",
  );
  console.log("0. GET /api/health", JSON.stringify(health));

  await post("/api/demo/reset");
  const clean = await get<{
    status: { version: { version: string }; tasksExecuted: number; policiesLearned: number };
  }>("/api/dashboard");
  assert.equal(clean.status.version.version, "v0");
  assert.equal(clean.status.tasksExecuted, 0);
  assert.equal(clean.status.policiesLearned, 0);
  console.log(
    "1. RESET  version=",
    clean.status.version.version,
    "tasks=",
    clean.status.tasksExecuted,
    "policies=",
    clean.status.policiesLearned,
  );

  const before = await post<{
    trace: { id: string; agentVersion: string; toolCalls: { tool: string }[] };
    evaluation: { overall: number; toolCallCount: number } | null;
    failures: { classification: string; description: string }[];
  }>("/api/runs", {});
  console.log("2. RUN v0  version=", before.trace.agentVersion);
  console.log("   tools=", tools(before.trace));
  console.log("   score=", before.evaluation?.overall, "calls=", before.evaluation?.toolCallCount);
  assert.deepEqual(
    before.trace.toolCalls.map((call) => call.tool),
    ["slack", "crm", "order_api", "knowledge_base"],
  );

  const analyzed = await post<{
    failures: { classification: string; description: string }[];
  }>("/api/analyze", { traceId: before.trace.id });
  console.log("3. ANALYZE failures=", analyzed.failures.map((failure) => failure.classification).join(", "));
  console.log("   ", analyzed.failures[0]?.description);
  assert.ok(analyzed.failures.some((failure) => failure.classification === "tool_ordering"));

  const learned = await post<{
    candidate: { id: string; recommendation: string; status: string; confidence: number };
  }>("/api/learn", { traceId: before.trace.id });
  const afterLearn = await get<{
    learning: { memories: { kind: string; title: string; validationStatus: string }[] };
  }>("/api/dashboard");
  console.log(
    "4. LEARN  candidate=",
    learned.candidate.recommendation,
    "status=",
    learned.candidate.status,
    "conf=",
    learned.candidate.confidence,
  );
  console.log("   memories before promote:");
  for (const memory of afterLearn.learning.memories) {
    console.log("    -", memory.kind, memory.validationStatus, memory.title);
  }
  assert.equal(learned.candidate.recommendation, "query order_api first");
  assert.ok(afterLearn.learning.memories.every((memory) => memory.validationStatus === "unvalidated"));

  const validated = await post<{
    benchmark: { oldScore: number; newScore: number; improvement: number; threshold: number };
  }>("/api/validate", { candidateId: learned.candidate.id });
  console.log(
    "5. VALIDATE",
    validated.benchmark.oldScore,
    "→",
    validated.benchmark.newScore,
    "Δ",
    validated.benchmark.improvement,
    "threshold",
    validated.benchmark.threshold,
  );
  assert.ok(validated.benchmark.newScore > validated.benchmark.oldScore);

  const promoted = await post<{ version: { version: string; defaultToolOrder: string[] } }>(
    "/api/promote",
    { candidateId: learned.candidate.id },
  );
  console.log("6. PROMOTE", promoted.version.version, promoted.version.defaultToolOrder.join(" → "));
  assert.equal(promoted.version.version, "v1");

  const dash = await get<{
    status: { version: { version: string }; learningStatus: string };
    promotionBanner: { title: string; policyText: string } | null;
    promotedPolicies: { action: string }[];
    learning: { memories: { kind: string; title: string; validationStatus: string }[] };
  }>("/api/dashboard");
  console.log("7. DASHBOARD version=", dash.status.version.version, "status=", dash.status.learningStatus);
  console.log("   banner=", dash.promotionBanner?.title);
  console.log("   policy=", dash.promotedPolicies[0]?.action);
  console.log("   memories after promote:");
  for (const memory of dash.learning.memories) {
    console.log("    -", memory.kind, memory.validationStatus, memory.title);
  }
  assert.equal(dash.promotionBanner?.title, "New policy promoted");
  assert.ok(
    dash.learning.memories.some(
      (memory) => memory.kind === "procedural" && memory.validationStatus === "promoted",
    ),
  );
  assert.ok(
    dash.learning.memories.some((memory) => memory.kind === "tool" && memory.validationStatus === "promoted"),
  );

  const after = await post<{
    trace: { agentVersion: string; toolCalls: { tool: string }[] };
    evaluation: { overall: number; toolCallCount: number } | null;
    failures: { classification: string }[];
  }>("/api/runs", {});
  console.log("8. RUN v1  version=", after.trace.agentVersion);
  console.log("   tools=", tools(after.trace));
  console.log("   score=", after.evaluation?.overall, "calls=", after.evaluation?.toolCallCount);
  console.log("   failures=", after.failures.length);
  assert.deepEqual(
    after.trace.toolCalls.map((call) => call.tool),
    ["order_api", "crm", "knowledge_base"],
  );
  assert.ok((after.evaluation?.overall ?? 0) > (before.evaluation?.overall ?? 1));

  const finalDash = await get<{
    before: { score: number; toolCalls: number } | null;
    after: { score: number; toolCalls: number } | null;
  }>("/api/dashboard");
  console.log(
    "9. BEFORE/AFTER score",
    finalDash.before?.score,
    "→",
    finalDash.after?.score,
    "calls",
    finalDash.before?.toolCalls,
    "→",
    finalDash.after?.toolCalls,
  );
  assert.ok(finalDash.before && finalDash.after);
  assert.ok(finalDash.after.score > finalDash.before.score);
  assert.ok(finalDash.after.toolCalls < finalDash.before.toolCalls);

  const v0 = store.versions.get(V0_VERSION_ID);
  assert.ok(v0);
  const task = store.tasks.get(DEMO_TASK_ID);
  assert.ok(task);
  const memoryOnly = createAgentRuntime({
    policyLoader: {
      async loadActive() {
        return [];
      },
      async loadForVersion() {
        return [];
      },
    },
    planner: createPlanner(createToolSelector(() => v0)),
    traceStore: {
      async save(trace) {
        return trace;
      },
      async get() {
        return null;
      },
      async list() {
        return [];
      },
    },
    costTracker: createSimpleCostTracker(),
    loadMemories: () => store.memories.list().filter((memory) => memory.validationStatus === "promoted"),
    getVersionId: () => "memory-only",
  });
  const isolated = await memoryOnly.execute(task);
  console.log("10. MEMORY-ONLY (no policies, v0 default order) tools=", tools(isolated));
  assert.deepEqual(
    isolated.toolCalls.map((call) => call.tool),
    ["order_api", "crm", "knowledge_base"],
  );

  console.log("\nLIVE APP PROOF PASSED");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
