import type { Memory } from "@/models";

export interface ProceduralMemoryStore {
  save(memory: Memory): Promise<Memory>;
  list(): Promise<Memory[]>;
}
