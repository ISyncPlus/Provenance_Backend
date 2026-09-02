import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./auth.js";
import { env } from "./env.js";
import { attachUser } from "./middleware/auth.js";
import { errorHandler, notFoundHandler } from "./middleware/errors.js";
import { requestIdMiddleware } from "./middleware/requestId.js";
import { generalRateLimiter } from "./middleware/rateLimiter.js";
import { HealthController } from "./presentation/controllers/healthController.js";
import { submissionsRouter } from "./routes/submissions.js";
import { meRouter } from "./routes/me.js";
import { statsRouter } from "./routes/stats.js";

export const createApp = () => {
  const app = express();
  const healthController = new HealthController();

  // Behind a reverse proxy (Render, Railway, Fly, Nginx), trust proxy allows
  // secure cookies and accurate IP rate-limiting.
  app.set("trust proxy", 1);

  app.disable("x-powered-by");

  // Assign correlation ID to all incoming requests
  app.use(requestIdMiddleware);

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: false,
    })
  );

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) return callback(null, true);
        if (env.allowedOrigins.includes(origin)) return callback(null, true);
        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
      methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
      maxAge: 86_400,
    })
  );

  if (!env.isProduction) {
    app.use(morgan("dev"));
  } else {
    app.use(morgan("combined"));
  }

  // Health check endpoints (Liveness & Deep Readiness probes)
  app.get("/health", healthController.live);
  app.get("/health/live", healthController.live);
  app.get("/health/ready", healthController.ready);

  /**
   * Better Auth mounts BEFORE express.json().
   * It reads the raw request stream directly.
   */
  app.all("/api/auth/*", toNodeHandler(auth));

  app.use(
    express.json({
      limit: "2mb",
    })
  );

  // Apply general API rate limiting
  app.use("/api", generalRateLimiter);

  app.use(attachUser);

  app.use("/api/me", meRouter);
  app.use("/api/submissions", submissionsRouter);
  app.use("/api/stats", statsRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};
