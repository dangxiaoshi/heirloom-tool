import type { Request, Response } from "express";
import { pollTranscriptionResult } from "../services/transcription/transcription.service.js";

export async function getTranscript(req: Request, res: Response) {
  const transcript = await pollTranscriptionResult(req.params.recordingId).catch((error: unknown) => {
    if (error instanceof Error && error.message === "transcript_not_found") {
      return null;
    }

    throw error;
  });

  if (!transcript) {
    res.status(404).json({
      recordingId: req.params.recordingId,
      status: "not_found",
    });
    return;
  }

  res.json(transcript);
}
