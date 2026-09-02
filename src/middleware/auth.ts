import { fromNodeHeaders } from "better-auth/node";
import type { NextFunction, Request, Response } from "express";
import type { Role } from "@prisma/client";
import { auth } from "../auth.js";
import { forbidden, unauthorized } from "../lib/httpError.js";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  image: string | null;
  role: Role;
  identifier: string | null;
  onboardedAt: Date | null;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Resolves the Better Auth session from the request cookies and attaches the
 * user. Never trusts a body or header field for identity.
 */
export const attachUser = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (session?.user) {
      const user = session.user as unknown as Record<string, unknown>;
      req.user = {
        id: String(user.id),
        name: String(user.name ?? ""),
        email: String(user.email ?? ""),
        image: (user.image as string | null) ?? null,
        role: (user.role as Role) ?? "student",
        identifier: (user.identifier as string | null) ?? null,
        onboardedAt: user.onboardedAt ? new Date(user.onboardedAt as string) : null,
      };
    }
    next();
  } catch (error) {
    next(error);
  }
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  next();
};

/**
 * Authorization lives here, not in the UI. Hiding a button is not access
 * control — every privileged route passes through this.
 */
export const requireRole =
  (...roles: Role[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(forbidden("This area is restricted to departmental reviewers."));
      return;
    }
    next();
  };

/** Blocks routes that need a claimed registration number / staff ID. */
export const requireOnboarded = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!req.user) {
    next(unauthorized());
    return;
  }
  if (!req.user.onboardedAt || !req.user.identifier) {
    next(
      forbidden(
        "Complete your profile before continuing — a registration number or staff ID is required."
      )
    );
    return;
  }
  next();
};
