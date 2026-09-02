import { PrismaClient } from "@prisma/client";
import { env } from "./env.js";

/**
 * A single client for the process. In development the module graph is rebuilt
 * on every save, so the instance is parked on `globalThis` to avoid leaking a
 * new connection pool per reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: env.isDevelopment ? ["warn", "error"] : ["error"],
  });

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}
