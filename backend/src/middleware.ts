import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { logError } from "./helpers.js";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logError(`${req.method} ${req.path}`, err);

  if (res.headersSent) {
    res.end();
    return;
  }

  res.status(500).json({
    success: false,
    message: err.message || "Internal server error",
  });
};

export const validate =
  (schema: ZodType<{ body?: unknown; params?: unknown; query?: unknown }>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      params: req.params,
      query: req.query,
    });

    if (!result.success) {
      const message = result.error.issues.map((i) => i.message).join(", ");
      res.status(400).json({ success: false, message });
      return;
    }

    if (result.data.body) req.body = result.data.body;
    next();
  };
