import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  const message = error instanceof Error ? error.message : "internal_server_error";

  res.status(500).json({
    error: message,
    ...(env.NODE_ENV === "development" ? { detail: String(error) } : {}),
  });
}
