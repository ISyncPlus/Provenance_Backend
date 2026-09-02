import type { Request, Response, NextFunction } from "express";
import crypto from "node:crypto";

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

/**
 * Assigns a unique correlation ID to every incoming request or preserves
 * an existing `x-request-id` header sent by an API gateway or reverse proxy.
 */
export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const existingId = req.headers["x-request-id"];
  const requestId =
    typeof existingId === "string" && existingId.trim().length > 0
      ? existingId.trim()
      : crypto.randomUUID();

  req.id = requestId;
  res.setHeader("X-Request-ID", requestId);
  next();
};
