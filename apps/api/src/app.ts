import cors from "cors";
import express from "express";
import { healthRouter } from "./routes/health.route.js";
import { sessionRouter } from "./routes/session.route.js";
import { recordingRouter } from "./routes/recording.route.js";
import { transcriptRouter } from "./routes/transcript.route.js";
import { memoryRouter } from "./routes/memory.route.js";
import { errorMiddleware } from "./middleware/error.middleware.js";

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/health", healthRouter);
  app.use("/api/sessions", sessionRouter);
  app.use("/api/recordings", recordingRouter);
  app.use("/api/transcripts", transcriptRouter);
  app.use("/api/memory-items", memoryRouter);

  app.use(errorMiddleware);

  return app;
}
