import type { Request, Response } from "express";

export function createSession(_req: Request, res: Response) {
  res.status(201).json({
    message: "session endpoint scaffolded",
  });
}
