import { Router } from "express";
import { getTranscript } from "../controllers/transcript.controller.js";

export const transcriptRouter = Router();

transcriptRouter.get("/:recordingId", getTranscript);
