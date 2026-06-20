import { useCallback, useRef, useState } from "react";
import { runChatStream } from "./chatApi";
import type { ChatRunMode, ChatStreamEvent } from "./chatTypes";

export type ToolActivityItem = {
  tool: string;
  input: string;
  output: string;
};

export type ThoughtItem = {
  text: string;
  time: string;
};

const initialState = {
  response: "",
  reasoning: [] as ThoughtItem[],
  tools: [] as ToolActivityItem[],
  error: "",
  loading: false,
};

export function useChatSession() {
  const [response, setResponse] = useState(initialState.response);
  const [reasoning, setReasoning] = useState(initialState.reasoning);
  const [tools, setTools] = useState(initialState.tools);
  const [error, setError] = useState(initialState.error);
  const [loading, setLoading] = useState(initialState.loading);

  const abortRef = useRef<AbortController | null>(null);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setResponse(initialState.response);
    setReasoning(initialState.reasoning);
    setTools(initialState.tools);
    setError(initialState.error);
    setLoading(false);
  }, []);

  const handleEvent = useCallback((event: ChatStreamEvent, v2: boolean) => {
    switch (event.type) {
      case "reasoning":
        setReasoning((prev) => [
          ...prev,
          {
            text: event.content,
            time: new Date().toLocaleTimeString(),
          },
        ]);
        break;
      case "tool_call":
        setTools((prev) => [
          ...prev,
          { tool: event.tool, input: event.input, output: event.output },
        ]);
        break;
      case "response":
        setResponse((prev) => prev + event.content);
        break;
      case "error":
        setError(event.message);
        break;
    }

    if (v2 && event.type === "reasoning") {
      // v2 uses same data but UI shows timeline cards
    }
  }, []);

  const send = useCallback(async (query: string, mode: ChatRunMode) => {
    if (!query.trim()) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setResponse("");
    setReasoning([]);
    setTools([]);
    setError("");
    setLoading(true);

    const v2 = mode === "live-v2";

    try {
      await runChatStream(
        query.trim(),
        mode,
        (event) => handleEvent(event, v2),
        controller.signal,
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [clear, handleEvent]);

  return { response, reasoning, tools, error, loading, send, clear };
}