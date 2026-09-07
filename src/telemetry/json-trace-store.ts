import type { ExecutionTrace } from "@/models";
import { store } from "@/store";
import type { TraceStore } from "./trace-store";

export function createJsonTraceStore(): TraceStore {
  return {
    async save(trace: ExecutionTrace) {
      return store.traces.save(trace);
    },
    async get(id: string) {
      return store.traces.get(id);
    },
    async list() {
      return [...store.traces.list()].sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    },
  };
}
