export interface ChatRequestBody {
  query: string;
}

export type ReasoningEvent = {
  type: "reasoning";
  content: string;
};

export type ToolCallEvent = {
  type: "tool_call";
  tool: string;
  input: string;
  output: string;
};

export type ResponseEvent = {
  type: "response";
  content: string;
};

export type ErrorEvent = {
  type: "error";
  message: string;
};

export type StreamEvent =
  | ReasoningEvent
  | ToolCallEvent
  | ResponseEvent
  | ErrorEvent;
