import type { Policy } from "@/models";
import { store } from "@/store";

export interface PolicyLoader {
  loadActive(): Promise<Policy[]>;
  loadForVersion(version: string): Promise<Policy[]>;
}

export function createPolicyLoader(): PolicyLoader {
  return {
    async loadActive() {
      return store.policies.list().filter((policy) => policy.status === "promoted");
    },
    async loadForVersion(versionId: string) {
      const version = store.versions.get(versionId);
      if (!version) {
        return [];
      }
      return version.policyIds
        .map((id) => store.policies.get(id))
        .filter((policy): policy is Policy => policy !== null);
    },
  };
}
