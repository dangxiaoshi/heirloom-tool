import type { Request, Response } from "express";
import { pollTranscriptionResult } from "../services/transcription/transcription.service.js";

function getRecordingId(params: Request["params"]) {
  const value = params.recordingId;
  return typeof value === "string" ? value : "";
}

export async function getTranscript(req: Request, res: Response) {
  const recordingId = getRecordingId(req.params);
  const transcript = await pollTranscriptionResult(recordingId).catch((error: unknown) => {
    if (error instanceof Error && error.message === "transcript_not_found") {
      return null;
    }

    throw error;
  });

  if (!transcript) {
    res.status(404).json({
      recordingId,
      status: "not_found",
    });
    return;
  }

  res.json(transcript);
}
