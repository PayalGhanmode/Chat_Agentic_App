import type { NextFunction, Request, Response } from "express";
import type { StreamEvent } from "./shared.types.js";

type AsyncRoute = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export const asyncHandler = (fn: AsyncRoute) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export function logInfo(msg: string) {
  console.log("[agent-chat]", msg);
}

export function logError(msg: string, err?: unknown) {
  console.error("[agent-chat]", msg, err ?? "");
}

/** Only prints in development */
export function logDebug(label: string, data?: unknown) {
  if (process.env.NODE_ENV !== "development") return;

  if (data === undefined) {
    console.log("[agent-chat][debug]", label);
    return;
  }

  console.log("[agent-chat][debug]", label, typeof data === "string" ? data : JSON.stringify(data, null, 2));
}

/** SSE stream */
export function createStream(res: Response) {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  return {
    send(event: StreamEvent) {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    },
    end() {
      res.end();
    },
  };
}
