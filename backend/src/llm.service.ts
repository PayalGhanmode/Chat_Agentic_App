import OpenAI from "openai";
import { env, getLlmConfig } from "./config.js";
import { logInfo } from "./helpers.js";

export type ChatMessage = OpenAI.Chat.Completions.ChatCompletionMessageParam;

type ToolCallResult = {
  id: string;
  name: string;
  arguments: string;
};

let client: OpenAI | null = null;
let model = "";

function setup() {
  if (!client) {
    const config = getLlmConfig();
    client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });
    model = config.model;
  }
  return { client: client!, model };
}

function buildToolCall(name: string, argsJson: string) {
  const toolCallId = `call_${Date.now()}`;
  return {
    message: {
      role: "assistant" as const,
      content: null,
      tool_calls: [
        {
          id: toolCallId,
          type: "function" as const,
          function: { name, arguments: argsJson },
        },
      ],
    },
    toolCalls: [{ id: toolCallId, name, arguments: argsJson }],
  };
}

function parseGroqBrokenTool(err: unknown): ToolCallResult | null {
  const failed = (err as { error?: { failed_generation?: string } })?.error?.failed_generation;
  if (!failed) return null;

  const match = failed.match(/<function=(\w+)(\{.*\})<\/function>/);
  if (!match) return null;

  try {
    JSON.parse(match[2]);
  } catch {
    return null;
  }

  return {
    id: `call_${Date.now()}`,
    name: match[1],
    arguments: match[2],
  };
}

function isToolCallError(err: unknown) {
  if (!(err instanceof Error)) return false;
  const msg = err.message.toLowerCase();
  return msg.includes("failed to call a function") || msg.includes("tool_use_failed");
}

/** Native OpenAI-style tool calling (works well on OpenAI) */
export async function askLLM(
  messages: ChatMessage[],
  tools?: OpenAI.Chat.Completions.ChatCompletionTool[],
) {
  const { client, model } = setup();

  const response = await client.chat.completions.create({
    model,
    messages,
    tools: tools?.length ? tools : undefined,
    tool_choice: tools?.length ? "auto" : undefined,
    parallel_tool_calls: false,
  });

  const message = response.choices[0]?.message;
  if (!message) throw new Error("LLM returned an empty response");

  const toolCalls = (message.tool_calls ?? []).map((tc) => ({
    id: tc.id,
    name: tc.function.name,
    arguments: tc.function.arguments,
  }));

  return { message, toolCalls };
}

/** Ask model in plain JSON if web search is needed (reliable on Groq) */
async function planSearchWithJson(userQuery: string) {
  const { client, model } = setup();

  const response = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `Decide if a web search is needed for current/recent facts.
Reply with ONLY valid JSON, no markdown:
{"needs_search": true, "search_query": "your search query"}
or
{"needs_search": false, "search_query": ""}`,
      },
      { role: "user", content: userQuery },
    ],
    temperature: 0,
  });

  const assistantMessage = response.choices[0]?.message;
  const raw = assistantMessage?.content?.trim() ?? "{}";

  let needsSearch = false;
  let searchQuery = userQuery;

  try {
    const parsed = JSON.parse(raw) as { needs_search?: boolean; search_query?: string };
    needsSearch = Boolean(parsed.needs_search);
    if (parsed.search_query?.trim()) searchQuery = parsed.search_query.trim();
  } catch {
    needsSearch = /\b(2024|2025|2026|latest|current|today|recent|news|now)\b/i.test(userQuery);
  }

  if (!needsSearch) {
    return {
      message: assistantMessage ?? { role: "assistant" as const, content: raw },
      toolCalls: [] as ToolCallResult[],
    };
  }

  return buildToolCall("web_search", JSON.stringify({ query: searchQuery }));
}

/** Plan next step: use tools or web search */
export async function planWithTools(
  messages: ChatMessage[],
  userQuery: string,
  tools: OpenAI.Chat.Completions.ChatCompletionTool[],
) {
  // Groq breaks native tool format — skip it, use JSON planning instead
  if (env.LLM_PROVIDER === "groq") {
    return planSearchWithJson(userQuery);
  }

  try {
    return await askLLM(messages, tools);
  } catch (err) {
    const recovered = parseGroqBrokenTool(err);
    if (recovered) {
      logInfo(`Recovered search from model output: ${recovered.name}`);
      return buildToolCall(recovered.name, recovered.arguments);
    }

    if (!isToolCallError(err)) throw err;

    logInfo("Using JSON search planning fallback");
    return planSearchWithJson(userQuery);
  }
}

/** Stream the final answer word by word */
export async function* streamLLM(messages: ChatMessage[]) {
  const { client, model } = setup();

  const stream = await client.chat.completions.create({
    model,
    messages,
    stream: true,
  });

  for await (const chunk of stream) {
    const text = chunk.choices[0]?.delta?.content;
    if (text) yield text;
  }
}
