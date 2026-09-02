import type { Request, Response } from "express";
import { prisma } from "../../db.js";
import { env } from "../../env.js";

export class HealthController {
  live = (_req: Request, res: Response): void => {
    res.json({
      ok: true,
      service: "provenance-api",
      status: "live",
      uptimeSeconds: Math.floor(process.uptime()),
      env: env.NODE_ENV,
    });
  };

  ready = async (_req: Request, res: Response): Promise<void> => {
    const start = performance.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      const latencyMs = Math.round(performance.now() - start);

      res.json({
        ok: true,
        service: "provenance-api",
        status: "ready",
        database: {
          status: "connected",
          latencyMs,
        },
        uptimeSeconds: Math.floor(process.uptime()),
        env: env.NODE_ENV,
      });
    } catch (error) {
      res.status(503).json({
        ok: false,
        service: "provenance-api",
        status: "unhealthy",
        database: {
          status: "disconnected",
          error: error instanceof Error ? error.message : "Unknown database error",
        },
      });
    }
  };
}
