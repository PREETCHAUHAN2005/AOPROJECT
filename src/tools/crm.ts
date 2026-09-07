import { sleep } from "@/lib/sleep";
import type { Tool } from "./types";
import { CUSTOMERS, ORDERS } from "./data/catalog";

export const crmTool: Tool = {
  name: "crm",
  description: "Customer records, tier, SLA, account manager, and contact context.",
  inputSchema: {
    type: "object",
    properties: {
      customerId: { type: "string" },
      orderId: { type: "string" },
    },
  },
  async execute(input) {
    await sleep(45);
    const customerId = String(input.customerId ?? "");
    const orderId = String(input.orderId ?? "");
    const order = ORDERS[orderId as keyof typeof ORDERS];
    const resolvedId = customerId || order?.customerId || "";
    const customer = CUSTOMERS[resolvedId as keyof typeof CUSTOMERS];

    if (!customer) {
      return {
        tool: "crm",
        found: false,
        customerId,
        orderId,
        message: "Customer record not found.",
      };
    }

    return {
      tool: "crm",
      found: true,
      orderId: orderId || order?.orderId,
      ...customer,
    };
  },
};
