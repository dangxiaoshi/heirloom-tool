import { Router } from "express";
import { getTranscript } from "../controllers/transcript.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const transcriptRouter = Router();

transcriptRouter.get("/:recordingId", asyncHandler(getTranscript));
