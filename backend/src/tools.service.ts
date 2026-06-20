import type OpenAI from "openai";
import { env } from "./config.js";
import { logDebug, logError, logInfo } from "./helpers.js";

export const WEB_SEARCH_TOOL: OpenAI.Chat.Completions.ChatCompletionTool = {
  type: "function",
  function: {
    name: "web_search",
    description:
      "Search the web for up-to-date facts, news, statistics, or anything that may have changed after your training data.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "A focused search query (keywords, year, topic).",
        },
      },
      required: ["query"],
    },
  },
};

async function mockSearch(query: string) {
  logDebug("mockSearch → query", query);

  const result = [
    `Search results for "${query}":`,
    "- AI agents and tool-calling became mainstream in production apps.",
    "- Major labs continued scaling multimodal models with stronger reasoning.",
    "- Enterprise adoption focused on RAG, agents, and governed deployments.",
  ].join("\n");

  logDebug("mockSearch → result preview", result.slice(0, 200) + (result.length > 200 ? "…" : ""));
  return result;
}

async function tavilySearch(query: string) {
  logDebug("tavilySearch → query", query);

  const res = await fetch("https://api.tavily.com/search", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    api_key: env.TAVILY_API_KEY,
    query,
    max_results: 3,        // was 5 — fewer pages to fetch = faster
    search_depth: "basic", // already the fast option, keep as-is
  }),
});

  logDebug("tavilySearch → response status", res.status);

  if (!res.ok) {
    logError(`tavilySearch failed for query: ${query}`, res.status);
    throw new Error(`Search failed (${res.status})`);
  }

  const data = (await res.json()) as {
    answer?: string;
    results?: Array<{ title?: string; url?: string; content?: string }>;
  };

  logDebug("tavilySearch → raw API keys", Object.keys(data));
  logDebug("tavilySearch → answer", data.answer ?? "(empty)");
  logDebug("tavilySearch → results count", (data.results ?? []).length);

  const parts: string[] = [];

  if (data.answer) {
    parts.push(`Summary: ${data.answer}`);
  }

  for (const r of (data.results ?? []).slice(0, 3)) {
    if (r.title && r.content) {
      const snippet = r.content.replace(/\s+/g, " ").trim().slice(0, 160);
      const truncated = snippet.length < r.content.trim().length ? `${snippet}…` : snippet;
      parts.push(`- ${r.title}: ${truncated}${r.url ? ` (Source: ${r.url})` : ""}`);
    }
  }

  logDebug("tavilySearch → built parts", parts);

  if (parts.length === 0) {
    const fallback = `No results for "${query}". Try a more specific query.`;
    logDebug("tavilySearch → no parts, using fallback", fallback);
    return fallback;
  }

  const result = parts.join("\n");
  logDebug("tavilySearch → final result length", result.length);

  return result;
}

export async function webSearch(query: string) {
  logInfo(`webSearch start | provider=${env.WEB_SEARCH_PROVIDER} | query="${query}"`);

  const result =
    env.WEB_SEARCH_PROVIDER === "tavily"
      ? await tavilySearch(query)
      : await mockSearch(query);

  logDebug("webSearch → done", { provider: env.WEB_SEARCH_PROVIDER, outputChars: result.length });

  return result;
}

/** Run any tool by name */
export async function runTool(name: string, rawInput: string) {
  logDebug("runTool → called", { name, rawInput });

  if (name !== "web_search") {
    throw new Error(`Unknown tool: ${name}`);
  }

  const { query } = JSON.parse(rawInput) as { query?: string };
  if (!query?.trim()) throw new Error("web_search needs a query");

  logDebug("runTool → parsed query", query);

  return webSearch(query.trim());
}