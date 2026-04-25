import type { Request, Response } from "express";

export function createRecording(req: Request, res: Response) {
  res.status(201).json({
    message: "recording endpoint scaffolded",
    file: req.file?.originalname ?? null,
  });
}
