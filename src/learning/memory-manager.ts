import { createId } from "@/lib/ids";
import type { LearningCandidate, Memory, Task } from "@/models";
import { store } from "@/store";

export interface MemoryManager {
  extract(candidate: LearningCandidate): Promise<Memory[]>;
  loadRelevant(task: Task): Promise<Memory[]>;
}

export function createMemoryManager(): MemoryManager {
  return {
    async extract(candidate) {
      const createdAt = new Date().toISOString();
      const sourceRuns = candidate.sourceTraceIds;
      const memories: Memory[] = [
        {
          id: createId("mem"),
          kind: "episodic",
          title: "Inefficient Slack-first order investigation",
          content:
            "The agent searched Slack before the Order API on an order investigation and paid an efficiency and policy cost.",
          confidence: candidate.confidence,
          evidenceCount: sourceRuns.length,
          sourceRuns,
          validationStatus: "unvalidated",
          performanceImpact: 0,
          createdAt,
        },
        {
          id: createId("mem"),
          kind: "procedural",
          title: "Authoritative order lookup first",
          content: `${candidate.condition}: ${candidate.recommendation}`,
          rule: candidate.avoid
            ? `${candidate.recommendation}; avoid ${candidate.avoid}`
            : candidate.recommendation,
          confidence: candidate.confidence,
          evidenceCount: sourceRuns.length,
          sourceRuns,
          validationStatus: "unvalidated",
          performanceImpact: 0,
          createdAt,
        },
        {
          id: createId("mem"),
          kind: "tool",
          title: "order_api is authoritative",
          content: "Order API contains authoritative order state and should be queried first.",
          confidence: candidate.confidence,
          evidenceCount: sourceRuns.length,
          sourceRuns,
          validationStatus: "unvalidated",
          performanceImpact: 0,
          toolName: "order_api",
          createdAt,
        },
        {
          id: createId("mem"),
          kind: "tool",
          title: "slack is non-authoritative chatter",
          content: "Slack is useful only for operational escalation, not as the first order-state lookup.",
          confidence: candidate.confidence,
          evidenceCount: sourceRuns.length,
          sourceRuns,
          validationStatus: "unvalidated",
          performanceImpact: 0,
          toolName: "slack",
          createdAt,
        },
      ];

      return memories.map((memory) => store.memories.save(memory));
    },
    async loadRelevant(task) {
      return store.memories.list().filter((memory) => {
        if (memory.validationStatus !== "promoted") {
          return false;
        }
        return task.domain === "order_investigation" || /order/i.test(task.prompt);
      });
    },
  };
}
