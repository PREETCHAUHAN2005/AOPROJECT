import type { Memory } from "@/models";

export interface EpisodicMemoryStore {
  save(memory: Memory): Promise<Memory>;
  list(): Promise<Memory[]>;
}
