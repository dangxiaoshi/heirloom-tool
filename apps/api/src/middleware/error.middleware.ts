import type { NextFunction, Request, Response } from "express";

export function errorMiddleware(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(error);
  res.status(500).json({ error: "internal_server_error" });
}
