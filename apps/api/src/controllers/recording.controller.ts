import type { Request, Response } from "express";
import { createRecordingWithUpload, startTranscriptionJob } from "../services/transcription/transcription.service.js";

export async function createRecording(req: Request, res: Response) {
  if (!req.file) {
    res.status(400).json({ error: "audio_file_required" });
    return;
  }

  const sessionId = typeof req.body.sessionId === "string" ? req.body.sessionId : undefined;
  const question = typeof req.body.question === "string" ? req.body.question : undefined;

  const recording = await createRecordingWithUpload({
    fileBuffer: req.file.buffer,
    fileName: req.file.originalname || "recording.webm",
    mimeType: req.file.mimetype || "audio/webm",
    sizeBytes: req.file.size,
    sessionId,
    question,
  });

  res.status(201).json(recording);
}

export async function startRecordingTranscription(req: Request, res: Response) {
  const { recordingId } = req.params;
  const result = await startTranscriptionJob(recordingId);

  res.json(result);
}
