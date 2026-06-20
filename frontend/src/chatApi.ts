import type { ChatRunMode, ChatStreamEvent } from "./chatTypes";

export const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function parseStreamChunk(block: string): ChatStreamEvent | null {
  const line = block.trim().split("\n").find((l) => l.startsWith("data: "));
  if (!line) return null;

  try {
    return JSON.parse(line.slice(6)) as ChatStreamEvent;
  } catch {
    return null;
  }
}

export async function runChatStream(
  query: string,
  mode: ChatRunMode,
  onEvent: (event: ChatStreamEvent) => void,
  signal?: AbortSignal,
) {
  const path = mode === "mock" ? "/chat/mock" : "/chat";

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Request failed (${res.status})`);
  }

  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const event = parseStreamChunk(part);
      if (event) onEvent(event);
    }
  }

  if (buffer.trim()) {
    const event = parseStreamChunk(buffer);
    if (event) onEvent(event);
  }
}