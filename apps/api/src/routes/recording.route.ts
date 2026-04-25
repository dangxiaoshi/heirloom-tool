import { Router } from "express";
import { createRecording } from "../controllers/recording.controller.js";
import { uploadAudio } from "../middleware/upload.middleware.js";

export const recordingRouter = Router();

recordingRouter.post("/", uploadAudio.single("audio"), createRecording);
