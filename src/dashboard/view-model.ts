import type { ExecutionTrace, LearningSnapshot } from "@/models";
import { collectMetrics } from "@/evaluation";
import { getLearningSnapshot, listRunInspections } from "@/learning";
import { ensureSeeded, getPersistenceState, store } from "@/store";
import type { ComparisonMetrics, DashboardView, DemoNextStep } from "./types";
import type { RunInspection } from "@/models";

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
    nextStep: deriveNextStep(learning, inspections[0] ?? null, traces),
    persistence: getPersistenceState(),
  };
}

function deriveNextStep(
  learning: LearningSnapshot,
  latest: RunInspection | null,
  traces: ExecutionTrace[],
): DemoNextStep {
  const promoted =
    learning.currentVersion.version !== "v0" &&
    learning.policies.some((policy) => policy.status === "promoted");

  if (promoted) {
    const hasAfterRun = traces.some((trace) => trace.agentVersion !== "v0");
    if (hasAfterRun) {
      return {
        id: "done",
        title: "Loop complete",
        reason: "v1 is active. Reset the demo to watch Slack-first behavior return.",
      };
    }
    return {
      id: "rerun",
      title: "Run again",
      reason: "The policy is promoted. Run the same task to see Order API first.",
    };
  }

  if (!latest) {
    return {
      id: "run",
      title: "Run Task",
      reason: "Start with the delayed-order investigation. v0 will search Slack first.",
    };
  }

  if (!latest.evaluation) {
    return {
      id: "analyze",
      title: "Analyze Run",
      reason: "Score this trace and classify the inefficiency before proposing a rule.",
    };
  }

  if (!learning.candidate || learning.candidate.status === "rejected") {
    return {
      id: "learn",
      title: "Generate Improvement",
      reason: "Turn the tool-ordering failure into a structured policy candidate.",
    };
  }

  if (!learning.benchmark) {
    return {
      id: "validate",
      title: "Validate Improvement",
      reason: "Benchmark the candidate against v0. It cannot change behavior yet.",
    };
  }

  if (learning.benchmark.improvement >= learning.benchmark.threshold) {
    return {
      id: "promote",
      title: "Promote Policy",
      reason: "Validation beat the threshold. Promote to make v1 the active agent.",
    };
  }

  return {
    id: "run",
    title: "Run Task",
    reason: "This candidate did not improve the benchmark. Reset and run v0 again.",
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
