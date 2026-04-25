import { Router } from "express";
import { createSession } from "../controllers/session.controller.js";

export const sessionRouter = Router();

sessionRouter.post("/", createSession);
