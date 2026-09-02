import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { HttpError } from "../lib/httpError.js";
import { env } from "../env.js";

export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    error: {
      code: "not_found",
      message: `No route matches ${req.method} ${req.path}`,
    },
  });
};

/**
 * One place that turns anything thrown in a handler into a JSON body. Internal
 * failures deliberately do not leak their message to the client in production —
 * the detail goes to the log instead.
 */
export const errorHandler = (
  error: unknown,
  _req: Request,
  res: Response,
  next: NextFunction
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: "validation_failed",
        message: "The request body did not match the expected shape.",
        details: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
    });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      res.status(409).json({
        error: {
          code: "conflict",
          message: "That value is already taken.",
        },
      });
      return;
    }
    if (error.code === "P2025") {
      res.status(404).json({
        error: { code: "not_found", message: "Record not found." },
      });
      return;
    }
  }

  console.error("[unhandled]", error);

  res.status(500).json({
    error: {
      code: "internal_error",
      message: env.isProduction
        ? "Something went wrong on our end."
        : error instanceof Error
          ? error.message
          : String(error),
    },
  });
};

/** Wraps an async handler so a rejected promise reaches the error handler. */
export const asyncRoute =
  <T extends Request>(
    handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>
  ) =>
  (req: T, res: Response, next: NextFunction) => {
    handler(req, res, next).catch(next);
  };
