import assert from "node:assert/strict";
import {
  createImprovement,
  executeTask,
  promoteCandidate,
  resetDemo,
  validateCandidate,
} from "../src/dashboard/runs";
import { getDashboardView } from "../src/dashboard/view-model";
import { DEMO_TASK_ID } from "../src/store";

async function main() {
  resetDemo();
  let view = getDashboardView();
  assert.equal(view.status.version.version, "v0");
  assert.equal(view.status.tasksExecuted, 0);
  assert.equal(view.status.policiesLearned, 0);
  assert.equal(view.latest, null);

  const before = await executeTask(DEMO_TASK_ID);
  assert.deepEqual(
    before.trace.toolCalls.map((call) => call.tool),
    ["slack", "crm", "order_api", "knowledge_base"],
  );
  assert.ok(before.evaluation);
  assert.ok(before.failures.some((failure) => failure.classification === "tool_ordering"));
  assert.ok(before.failures[0]?.description.includes("Slack before querying the authoritative Order API"));

  const candidate = await createImprovement(before.trace.id);
  const again = await createImprovement(before.trace.id);
  assert.equal(again.id, candidate.id);
  assert.equal(candidate.recommendation, "query order_api first");

  const benchmark = await validateCandidate(candidate.id);
  const benchmarkAgain = await validateCandidate(candidate.id);
  assert.equal(benchmarkAgain.id, benchmark.id);
  assert.ok(benchmark.newScore > benchmark.oldScore);

  const version = await promoteCandidate(candidate.id);
  const versionAgain = await promoteCandidate(candidate.id);
  assert.equal(version.version, "v1");
  assert.equal(versionAgain.version, "v1");

  const after = await executeTask(DEMO_TASK_ID);
  assert.deepEqual(
    after.trace.toolCalls.map((call) => call.tool),
    ["order_api", "crm", "knowledge_base"],
  );

  view = getDashboardView();
  assert.equal(view.status.version.version, "v1");
  assert.equal(view.status.learningStatus, "Policy promoted");
  assert.ok(view.promotionBanner?.title === "New policy promoted");
  assert.ok(view.promotedPolicies.length >= 1);
  assert.ok(view.before && view.after);
  assert.ok(view.after.score > view.before.score);
  assert.ok(view.after.toolCalls < view.before.toolCalls);
  assert.ok(view.learning.versions.some((item) => item.version === "v0"));
  assert.ok(view.learning.versions.some((item) => item.version === "v1"));

  console.log("Evolyn live-demo flow passed.");
  console.log(`1-5. v0 tools ${before.trace.toolCalls.map((call) => call.tool).join(" → ")} score ${before.evaluation?.overall}`);
  console.log(`6. failure ${before.failures[0]?.classification}`);
  console.log(`7. candidate ${candidate.recommendation}`);
  console.log(`8. validate ${benchmark.oldScore} → ${benchmark.newScore}`);
  console.log(`9. promoted ${version.version}`);
  console.log(`10-11. v1 tools ${after.trace.toolCalls.map((call) => call.tool).join(" → ")}`);
  console.log(`12. before/after score ${view.before.score} → ${view.after.score}`);
  console.log(`13. policy ${view.promotedPolicies[0]?.action}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
