import type { Memory } from "@/models";

export interface ToolMemoryStore {
  save(memory: Memory): Promise<Memory>;
  list(): Promise<Memory[]>;
}
