import { extractOrderId } from "@/lib/order-id";
import type { Task } from "@/models";

export function buildToolInput(
  task: Task,
  toolName: string,
  observations: unknown[],
): Record<string, unknown> {
  const orderId = extractOrderId(task.prompt) ?? findString(observations, "orderId");
  const customerId = findString(observations, "customerId");

  switch (toolName) {
    case "order_api":
      return { orderId };
    case "crm":
      return { orderId, customerId };
    case "knowledge_base":
      return {
        query: "delayed order warehouse hold enterprise escalation policy",
      };
    case "slack":
      return {
        query: orderId ? `order ${orderId} delay` : task.prompt,
        channel: "ops-fulfillment",
      };
    default:
      return { query: task.prompt, orderId };
  }
}

function findString(observations: unknown[], key: string): string | undefined {
  for (const observation of observations) {
    if (observation && typeof observation === "object" && key in observation) {
      const value = (observation as Record<string, unknown>)[key];
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    }
  }
  return undefined;
}
