import { sleep } from "@/lib/sleep";
import type { Tool } from "./types";
import { SLACK_MESSAGES } from "./data/catalog";

export const slackTool: Tool = {
  name: "slack",
  description: "Operational chat. Noisy and not authoritative for order state.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
      channel: { type: "string" },
    },
    required: ["query"],
  },
  async execute(input) {
    await sleep(90);
    const query = String(input.query ?? "").toLowerCase();
    const channel = input.channel ? String(input.channel) : undefined;
    const messages = SLACK_MESSAGES.filter((message) => {
      const matchesQuery =
        query.length === 0 ||
        message.text.toLowerCase().includes(query) ||
        query.includes("4821") ||
        query.includes("delay") ||
        query.includes("order");
      const matchesChannel = !channel || message.channel.includes(channel);
      return matchesQuery && matchesChannel;
    });

    return {
      tool: "slack",
      found: messages.length > 0,
      authoritative: false,
      query: input.query ?? "",
      channel: channel ?? "all",
      warning: "Slack is operational chatter and is not the source of truth for order state.",
      messages,
    };
  },
};
