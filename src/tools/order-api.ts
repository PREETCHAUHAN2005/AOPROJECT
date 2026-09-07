import { sleep } from "@/lib/sleep";
import type { Tool } from "./types";
import { ORDERS } from "./data/catalog";

export const orderApiTool: Tool = {
  name: "order_api",
  description: "Authoritative order system for status, delay codes, warehouse, and carrier state.",
  inputSchema: {
    type: "object",
    properties: {
      orderId: { type: "string", description: "Order identifier, e.g. 4821" },
    },
    required: ["orderId"],
  },
  async execute(input) {
    await sleep(20);
    const orderId = String(input.orderId ?? "");
    const order = ORDERS[orderId as keyof typeof ORDERS];

    if (!order) {
      return {
        tool: "order_api",
        found: false,
        orderId,
        message: "Order not found.",
      };
    }

    return {
      tool: "order_api",
      found: true,
      ...order,
    };
  },
};
