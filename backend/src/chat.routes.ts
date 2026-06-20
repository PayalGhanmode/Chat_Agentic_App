import { Router } from "express";
import type { Request, Response } from "express";
import { z } from "zod";
import { runAgent } from "./agent.service.js";
import { createStream, asyncHandler } from "./helpers.js";
import { validate } from "./middleware.js";

const chatBodySchema = z.object({
  body: z.object({
    query: z.string().trim().min(1, "query is required"),
  }),
});

const chatHandler = asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.body as { query: string };
  const stream = createStream(res);

  try {
    await runAgent(query, stream.send);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong";
    stream.send({ type: "error", message });
  } finally {
    stream.end();
  }
});

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Demo stream — no LLM tokens used */
const mockChatHandler = asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.body as { query: string };
  const stream = createStream(res);

  stream.send({
    type: "reasoning",
    content: "Mock mode: analyzing your question (no API call).",
  });

  await delay(400);

  stream.send({
    type: "reasoning",
    content: `Mock mode: would search the web for "${query}".`,
  });

  await delay(500);

  stream.send({
    type: "tool_call",
    tool: "web_search",
    input: query,
    output: `Mock results for "${query}":\n- Sample trend 1\n- Sample trend 2\n- Sample trend 3`,
  });

  await delay(400);

  stream.send({ type: "reasoning", content: "Mock mode: composing answer…" });

  const answer = `This is a mock response for: "${query}". Connect a real API key and use Send Query for live AI answers.`;
  for (const word of answer.split(" ")) {
    await delay(40);
    stream.send({ type: "response", content: word + " " });
  }

  stream.end();
});

export const chatRoutes = Router();

chatRoutes.post("/", validate(chatBodySchema), chatHandler);
chatRoutes.post("/mock", validate(chatBodySchema), mockChatHandler);
