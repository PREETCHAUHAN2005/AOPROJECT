import { createEvolynRuntime } from "@/agent";
import { createEvaluator } from "@/learning/evaluator";
import type { AgentVersion, Policy, Task } from "@/models";

export const BENCHMARK_THRESHOLD = 0.08;

export const ORDER_BENCHMARK_PROMPTS = [
  "Investigate why order #4821 was delayed and determine what action should be taken.",
  "Investigate why order #4904 was delayed and determine what action should be taken.",
  "Investigate why order #5012 was delayed and determine what action should be taken.",
];

export interface Benchmark {
  run(version: AgentVersion, policies: Policy[]): Promise<number>;
}

export function createOrderBenchmark(): Benchmark {
  return {
    async run(_version, policies) {
      return averageScore(policies);
    },
  };
}

export async function averageScore(policies: Policy[]): Promise<number> {
  const runtime = createEvolynRuntime({
    policyLoader: {
      async loadActive() {
        return policies.filter((policy) => policy.status === "promoted");
      },
      async loadForVersion() {
        return policies;
      },
    },
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
    getVersionId: () => "benchmark",
  });

  const evaluator = createEvaluator();
  const scores: number[] = [];

  for (const [index, prompt] of ORDER_BENCHMARK_PROMPTS.entries()) {
    const task: Task = {
      id: `benchmark-task-${index + 1}`,
      prompt,
      domain: "order_investigation",
      createdAt: new Date().toISOString(),
    };
    const trace = await runtime.execute(task);
    const evaluation = await evaluator.evaluate(trace);
    scores.push(evaluation.overall);
  }

  return Number((scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(2));
}
