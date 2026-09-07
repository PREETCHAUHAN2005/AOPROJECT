import { createId } from "@/lib/ids";
import type { LearningEvent, LearningEventType } from "@/models";
import { store } from "@/store";

export function recordLearningEvent(
  type: LearningEventType,
  summary: string,
  extra: Partial<Pick<LearningEvent, "candidateId" | "policyId" | "version">> = {},
): LearningEvent {
  return store.learningEvents.save({
    id: createId("learn"),
    type,
    summary,
    createdAt: new Date().toISOString(),
    ...extra,
  });
}
