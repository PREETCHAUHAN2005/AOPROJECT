import { store } from "@/store";

export interface DashboardMetrics {
  taskSuccessRate: number;
  averageQuality: number;
  averageToolCalls: number;
  averageLatencyMs: number;
  estimatedCost: number;
  averageUnnecessaryToolCalls: number;
  learningCandidates: number;
  promotedPolicies: number;
  rejectedPolicies: number;
  failureRecurrence: Record<string, number>;
}

export interface MetricsCollector {
  collect(): Promise<DashboardMetrics>;
}

export function collectMetrics(): DashboardMetrics {
  const traces = store.traces.list().filter((trace) => trace.agentVersion !== "benchmark");
  const evaluations = store.evaluations.list();
  const failures = store.failures.list();
  const policies = store.policies.list();

  return {
    taskSuccessRate: average(traces.map((trace) => (trace.success ? 1 : 0))),
    averageQuality: average(
      traces.filter((trace) => trace.qualityScore > 0).map((trace) => trace.qualityScore),
    ),
    averageToolCalls: average(traces.map((trace) => trace.toolCallCount)),
    averageLatencyMs: average(traces.map((trace) => trace.latencyMs)),
    estimatedCost: average(traces.map((trace) => trace.estimatedCost)),
    averageUnnecessaryToolCalls: average(
      evaluations.map((evaluation) => evaluation.unnecessaryToolCalls),
    ),
    learningCandidates: store.candidates.list().length,
    promotedPolicies: policies.filter((policy) => policy.status === "promoted").length,
    rejectedPolicies: policies.filter((policy) => policy.status === "rejected").length,
    failureRecurrence: failures.reduce<Record<string, number>>((counts, failure) => {
      counts[failure.classification] = (counts[failure.classification] ?? 0) + 1;
      return counts;
    }, {}),
  };
}

export function createMetricsCollector(): MetricsCollector {
  return {
    async collect() {
      return collectMetrics();
    },
  };
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(3));
}
