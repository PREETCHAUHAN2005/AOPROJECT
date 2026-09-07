import assert from "node:assert/strict";
import { createEvolynRuntime } from "../src/agent";
import {
  createImprovement,
  executeTask,
  promoteCandidate,
  validateCandidate,
} from "../src/dashboard/runs";
import { createId } from "../src/lib/ids";
import {
  DEMO_TASK_ID,
  DEMO_TASK_PROMPT,
  V0_TOOL_ORDER,
  V0_VERSION_ID,
  resetToSeed,
  store,
} from "../src/store";
import { getTool, listTools } from "../src/tools";

async function main() {
  const seeded = resetToSeed();
  assert.equal(seeded.currentVersionId, V0_VERSION_ID);
  assert.deepEqual(seeded.versions[0]?.defaultToolOrder, [...V0_TOOL_ORDER]);
  assert.equal(seeded.tasks[0]?.id, DEMO_TASK_ID);
  assert.equal(seeded.tasks[0]?.prompt, DEMO_TASK_PROMPT);

  const policy = store.policies.save({
    id: createId("policy"),
    condition: "smoke test write",
    action: "persist and read back",
    confidence: 1,
    evidenceCount: 1,
    status: "pending",
    createdFromRuns: [],
    performanceBefore: null,
    performanceAfter: null,
    createdAt: new Date().toISOString(),
  });
  assert.equal(store.policies.get(policy.id)?.action, "persist and read back");
  resetToSeed();
  assert.equal(store.policies.list().length, 0);

  const toolNames = listTools().map((tool) => tool.name).sort();
  assert.deepEqual(toolNames, ["crm", "knowledge_base", "order_api", "slack"]);
  assert.equal(((await getTool("order_api").execute({ orderId: "4821" })) as { found: boolean }).found, true);
  assert.equal(((await getTool("order_api").execute({ orderId: "4904" })) as { found: boolean }).found, true);

  const before = await executeTask(DEMO_TASK_ID);
  assert.deepEqual(
    before.trace.toolCalls.map((call) => call.tool),
    ["slack", "crm", "order_api", "knowledge_base"],
  );
  assert.ok(before.evaluation);
  assert.ok(before.failures.some((failure) => failure.classification === "tool_ordering"));

  const candidate = await createImprovement(before.trace.id);
  assert.equal(candidate.type, "tool_policy");
  assert.equal(candidate.condition, "task requires authoritative order state");
  assert.equal(candidate.recommendation, "query order_api first");
  assert.equal(candidate.avoid, "slack before authoritative lookup");
  assert.equal(candidate.reason, "order_api is authoritative");
  assert.ok(candidate.confidence >= 0.8);
  assert.equal(store.candidates.get(candidate.id)?.status, "proposed");
  assert.ok(store.memories.list().some((memory) => memory.kind === "procedural"));
  assert.ok(store.memories.list().some((memory) => memory.toolName === "order_api"));

  const benchmark = await validateCandidate(candidate.id);
  assert.ok(benchmark.newScore > benchmark.oldScore);
  assert.ok(benchmark.improvement >= benchmark.threshold);

  const version = await promoteCandidate(candidate.id);
  assert.equal(version.version, "v1");
  assert.deepEqual(version.defaultToolOrder, ["order_api", "crm", "knowledge_base"]);
  assert.equal(store.getCurrentVersion().version, "v1");
  assert.ok(store.policies.list().some((item) => item.status === "promoted"));
  assert.ok(store.memories.list().some((memory) => memory.kind === "procedural" && memory.validationStatus === "promoted"));
  assert.ok(store.memories.list().some((memory) => memory.kind === "tool" && memory.validationStatus === "promoted"));
  assert.ok(store.learningEvents.list().some((event) => event.type === "promoted"));

  const after = await executeTask(DEMO_TASK_ID);
  assert.deepEqual(
    after.trace.toolCalls.map((call) => call.tool),
    ["order_api", "crm", "knowledge_base"],
  );
  assert.ok(!after.trace.toolCalls.some((call) => call.tool === "slack"));
  assert.ok(after.trace.qualityScore > before.trace.qualityScore);

  const { analyzeTrace } = await import("../src/learning");
  const fresh = await createEvolynRuntime().execute(store.tasks.get(DEMO_TASK_ID)!);
  assert.deepEqual(
    fresh.toolCalls.map((call) => call.tool),
    ["order_api", "crm", "knowledge_base"],
  );
  await analyzeTrace(fresh.id);

  console.log("Evolyn smoke test passed.");
  console.log(`- v0 tools: ${before.trace.toolCalls.map((call) => call.tool).join(" → ")}`);
  console.log(`- candidate ${candidate.recommendation} confidence ${candidate.confidence}`);
  console.log(`- benchmark ${benchmark.oldScore} → ${benchmark.newScore} (${benchmark.improvement})`);
  console.log(`- promoted ${version.version}`);
  console.log(`- v1 tools: ${after.trace.toolCalls.map((call) => call.tool).join(" → ")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
