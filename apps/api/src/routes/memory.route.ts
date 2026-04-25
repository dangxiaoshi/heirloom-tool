import { Router } from "express";
import { createMemoryItem } from "../controllers/memory.controller.js";

export const memoryRouter = Router();

memoryRouter.post("/", createMemoryItem);
