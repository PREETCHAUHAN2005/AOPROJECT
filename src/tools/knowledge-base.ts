import { sleep } from "@/lib/sleep";
import type { Tool } from "./types";
import { KB_ARTICLES } from "./data/catalog";

export const knowledgeBaseTool: Tool = {
  name: "knowledge_base",
  description: "Policy and playbook articles for delay handling and escalation.",
  inputSchema: {
    type: "object",
    properties: {
      query: { type: "string" },
    },
    required: ["query"],
  },
  async execute(input) {
    await sleep(35);
    const query = String(input.query ?? "").toLowerCase();
    const articles = KB_ARTICLES.filter((article) => {
      const haystack = `${article.title} ${article.body}`.toLowerCase();
      return (
        query.length === 0 ||
        query.split(/\s+/).some((term) => term.length > 3 && haystack.includes(term)) ||
        haystack.includes("delay") ||
        haystack.includes("enterprise")
      );
    });

    return {
      tool: "knowledge_base",
      found: articles.length > 0,
      query: input.query ?? "",
      articles: articles.length > 0 ? articles : KB_ARTICLES,
    };
  },
};
