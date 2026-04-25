import type { Request, Response } from "express";

export function createMemoryItem(_req: Request, res: Response) {
  res.status(201).json({
    message: "memory item endpoint scaffolded",
  });
}
