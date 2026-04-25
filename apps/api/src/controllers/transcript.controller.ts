import type { Request, Response } from "express";

export function getTranscript(req: Request, res: Response) {
  res.json({
    recordingId: req.params.recordingId,
    message: "transcript endpoint scaffolded",
  });
}
