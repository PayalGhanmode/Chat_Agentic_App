export type ChatStreamEvent =
  | { type: "reasoning"; content: string }
  | { type: "tool_call"; tool: string; input: string; output: string }
  | { type: "response"; content: string }
  | { type: "error"; message: string };

export type ChatRunMode = "live" | "live-v2" | "mock";