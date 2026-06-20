import { planWithTools, streamLLM, type ChatMessage } from "./llm.service.js";
import { WEB_SEARCH_TOOL, runTool } from "./tools.service.js";
import type { StreamEvent } from "./shared.types.js";

export const AGENT_SYSTEM_PROMPT = `You are a helpful research assistant.

When the user asks about current events, recent news, statistics, market data, or anything time-sensitive, use the web_search tool before answering.

Rules:
- Prefer one focused web_search query over many vague ones.
- After receiving search results, synthesize a clear, accurate answer.
- If you already have enough context and no tool is needed, answer directly.
- Be concise but informative.`;

const MAX_TOOL_ROUNDS = 3;

type SendFn = (event: StreamEvent) => void;

export async function runAgent(query: string, send: SendFn) {
  const messages: ChatMessage[] = [
    { role: "system", content: AGENT_SYSTEM_PROMPT },
    { role: "user", content: query },
  ];

  send({
    type: "reasoning",
    content: "Reading your question and checking if I need web search.",
  });

  let rounds = 0;

  while (rounds < MAX_TOOL_ROUNDS) {
    const { message, toolCalls } = await planWithTools(messages, query, [WEB_SEARCH_TOOL]);

    if (toolCalls.length === 0) {
      messages.push(message);
      break;
    }

    messages.push(message as ChatMessage);

    for (const call of toolCalls) {
      const { query: searchQuery = query } = JSON.parse(call.arguments) as { query?: string };

      send({
        type: "reasoning",
        content: `Searching the web for "${searchQuery}"…`,
      });

      const output = await runTool(call.name, call.arguments);

      send({
        type: "tool_call",
        tool: call.name,
        input: searchQuery,
        output,
      });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: output,
      });
    }

    send({ type: "reasoning", content: "Got search results. Preparing answer…" });
    rounds++;
  }

  send({ type: "reasoning", content: "Writing response…" });

  for await (const chunk of streamLLM(messages)) {
    send({ type: "response", content: chunk });
  }
}
