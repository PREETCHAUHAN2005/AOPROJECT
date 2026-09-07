import type { Memory, Policy } from "@/models";

export const LEARNED_ORDER_INVESTIGATION_TOOLS = ["order_api", "crm", "knowledge_base"] as const;

export function applyPromotedPolicies(baseOrder: string[], policies: Policy[]): string[] {
  let order = [...baseOrder];

  for (const policy of policies) {
    if (policy.status !== "promoted") {
      continue;
    }

    const explicit = policy.action.match(/use tools?:\s*([^;]+)/i);
    if (explicit?.[1]) {
      const named = parseToolList(explicit[1]);
      if (named.length > 0) {
        return named;
      }
    }

    if (/query order_api first/i.test(policy.action) || /order_api before slack/i.test(policy.action)) {
      order = ["order_api", ...order.filter((name) => name !== "order_api")];
    }

    if (/slack before authoritative/i.test(policy.action) || /avoid:?\s*slack/i.test(policy.action)) {
      order = order.filter((name) => name !== "slack");
    }
  }

  return order;
}

export function applyPromotedMemories(baseOrder: string[], memories: Memory[]): string[] {
  let order = [...baseOrder];

  for (const memory of memories) {
    if (memory.validationStatus !== "promoted") {
      continue;
    }
    const text = `${memory.rule ?? ""} ${memory.content} ${memory.title}`;
    if (/query order_api first/i.test(text) || /order_api is authoritative/i.test(text)) {
      order = ["order_api", ...order.filter((name) => name !== "order_api")];
    }
    if (/slack before authoritative/i.test(text) || /avoid.*slack/i.test(text) || /non-authoritative chatter/i.test(text)) {
      order = order.filter((name) => name !== "slack");
    }
  }

  return order;
}

function parseToolList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}
