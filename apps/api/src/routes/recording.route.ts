import { Router } from "express";
import { createRecording, startRecordingTranscription } from "../controllers/recording.controller.js";
import { uploadAudio } from "../middleware/upload.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const recordingRouter = Router();

recordingRouter.post("/", uploadAudio.single("audio"), asyncHandler(createRecording));
recordingRouter.post("/:recordingId/transcribe", asyncHandler(startRecordingTranscription));
