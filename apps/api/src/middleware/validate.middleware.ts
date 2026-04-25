import type { NextFunction, Request, Response } from "express";

export function validateRequest(_req: Request, _res: Response, next: NextFunction) {
  next();
}
