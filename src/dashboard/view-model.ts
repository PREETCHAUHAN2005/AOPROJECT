import type { ExecutionTrace, LearningSnapshot } from "@/models";
import { collectMetrics } from "@/evaluation";
import { getLearningSnapshot, listRunInspections } from "@/learning";
import { ensureSeeded, store } from "@/store";
import type { ComparisonMetrics, DashboardView } from "./types";

export type { ComparisonMetrics, DashboardView } from "./types";

export function getDashboardView(): DashboardView {
  ensureSeeded();
  const inspections = listRunInspections();
  const learning = getLearningSnapshot();
  const traces = store.traces.list().filter((trace) => trace.agentVersion !== "benchmark");
  const evaluatedIds = new Set(store.evaluations.list().map((evaluation) => evaluation.traceId));
  const promotedPolicies = learning.policies.filter((policy) => policy.status === "promoted");
  const latestPromoted = [...promotedPolicies].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
  const promotedEvent = learning.events.find((event) => event.type === "promoted");

  return {
    product: "Evolyn",
    tagline: "An agent that learns how to become a better agent.",
    defaultTask:
      "Investigate why order #4821 was delayed and determine what action should be taken.",
    status: {
      version: learning.currentVersion,
      learningStatus: deriveLearningStatus(learning, traces),
      tasksExecuted: traces.length,
      policiesLearned: promotedPolicies.length,
    },
    latest: inspections[0] ?? null,
    inspections,
    learning,
    promotedPolicies,
    promotionBanner:
      promotedEvent && latestPromoted
        ? {
            title: "New policy promoted",
            policyText: `${latestPromoted.condition}: ${latestPromoted.action}`,
          }
        : null,
    before: averageTraces(
      traces.filter((trace) => trace.agentVersion === "v0"),
      evaluatedIds,
    ),
    after: averageTraces(
      traces.filter((trace) => trace.agentVersion !== "v0"),
      evaluatedIds,
    ),
    metrics: collectMetrics(),
  };
}

function deriveLearningStatus(learning: LearningSnapshot, traces: ExecutionTrace[]): string {
  if (
    learning.currentVersion.version !== "v0" &&
    learning.policies.some((policy) => policy.status === "promoted")
  ) {
    return "Policy promoted";
  }
  if (learning.candidate?.status === "rejected") {
    return "Candidate rejected";
  }
  if (learning.benchmark && learning.candidate && learning.candidate.status !== "promoted") {
    return learning.benchmark.improvement >= learning.benchmark.threshold
      ? "Ready to promote"
      : "Validation failed";
  }
  if (learning.candidate) {
    return "Candidate proposed";
  }
  if (traces.some((trace) => trace.failureClassification.length > 0)) {
    return "Failure detected";
  }
  if (traces.length > 0) {
    return "Executed";
  }
  return "Ready";
}

function averageTraces(
  traces: ExecutionTrace[],
  evaluatedIds: Set<string>,
): ComparisonMetrics | null {
  if (traces.length === 0) {
    return null;
  }
  const scored = traces.filter((trace) => evaluatedIds.has(trace.id) || trace.qualityScore > 0);
  const scoreSource = scored.length > 0 ? scored : traces;
  return {
    score: avg(scoreSource.map((trace) => trace.qualityScore)),
    toolCalls: avg(traces.map((trace) => trace.toolCallCount)),
    latencyMs: avg(traces.map((trace) => trace.latencyMs)),
    cost: avg(traces.map((trace) => trace.estimatedCost)),
    runs: traces.length,
  };
}

function avg(values: number[]): number {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}
