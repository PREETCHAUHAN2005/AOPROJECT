import { DATA_FILE, ensureSeeded, store } from "@/store";
import type { AgentVersion, Task } from "@/models";

export interface FoundationState {
  product: "Evolyn";
  tagline: string;
  persistence: string;
  currentVersion: AgentVersion;
  demoTask: Task;
  counts: {
    tasks: number;
    traces: number;
    evaluations: number;
    failures: number;
    memories: number;
    policies: number;
    candidates: number;
    versions: number;
    benchmarks: number;
  };
}

export function getFoundationState(): FoundationState {
  const db = ensureSeeded();
  const currentVersion = store.getCurrentVersion();
  const demoTask = store.tasks.get(db.tasks[0]?.id ?? "") ?? db.tasks[0];

  if (!demoTask) {
    throw new Error("Seed demo task is missing.");
  }

  return {
    product: "Evolyn",
    tagline: "An agent that learns how to become a better agent.",
    persistence: DATA_FILE,
    currentVersion,
    demoTask,
    counts: {
      tasks: db.tasks.length,
      traces: db.traces.length,
      evaluations: db.evaluations.length,
      failures: db.failures.length,
      memories: db.memories.length,
      policies: db.policies.length,
      candidates: db.candidates.length,
      versions: db.versions.length,
      benchmarks: db.benchmarks.length,
    },
  };
}
