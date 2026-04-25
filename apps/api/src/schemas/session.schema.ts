import { z } from "zod";

export const createSessionSchema = z.object({
  elderName: z.string().min(1),
  relation: z.string().min(1),
  topic: z.string().optional(),
});
