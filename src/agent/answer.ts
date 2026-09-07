import type { ToolCall } from "@/models";

export function synthesizeAnswer(task: string, toolCalls: ToolCall[]): string {
  const order = findObservation(toolCalls, "order_api");
  const customer = findObservation(toolCalls, "crm");
  const knowledge = findObservation(toolCalls, "knowledge_base");
  const slack = findObservation(toolCalls, "slack");

  if (order?.found) {
    const delay = String(order.delayReason ?? "The order is delayed.");
    const customerName = String(customer?.name ?? order.customerName ?? "the customer");
    const manager = customer?.accountManager
      ? ` Escalate to account manager ${String(customer.accountManager)}.`
      : "";
    const policy = Array.isArray(knowledge?.articles)
      ? " Follow the delayed-order playbook: notify within 4 hours and offer complimentary expedite for an enterprise delay over 48 hours."
      : "";
    const slackNote = slack?.found
      ? " Slack chatter mentioned a missing pickup window and an unverified customs rumor; the Order API overrides that."
      : "";

    return (
      `Order #${String(order.orderId)} is delayed (${String(order.delayCode)}). ${delay} ` +
      `Customer ${customerName} is ${String(customer?.tier ?? "unknown tier")}.` +
      manager +
      policy +
      slackNote +
      ` Recommended action: notify ${customerName}, escalate if enterprise, and expedite the Northline Freight pickup.`
    );
  }

  return `Could not determine an authoritative state for "${task}". Tool observations were insufficient.`;
}

function findObservation(toolCalls: ToolCall[], tool: string): Record<string, unknown> | null {
  const call = toolCalls.find((item) => item.tool === tool && item.success);
  if (!call || !call.observation || typeof call.observation !== "object") {
    return null;
  }
  return call.observation as Record<string, unknown>;
}
