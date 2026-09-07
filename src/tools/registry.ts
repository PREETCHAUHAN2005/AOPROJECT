import { crmTool } from "./crm";
import { knowledgeBaseTool } from "./knowledge-base";
import { orderApiTool } from "./order-api";
import { slackTool } from "./slack";
import type { Tool } from "./types";

const tools: Tool[] = [orderApiTool, crmTool, knowledgeBaseTool, slackTool];

export function listTools(): Tool[] {
  return tools;
}

export function getTool(name: string): Tool {
  const tool = tools.find((item) => item.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool;
}
