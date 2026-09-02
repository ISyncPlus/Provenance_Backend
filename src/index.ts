import { createApp } from "./app.js";
import { env } from "./env.js";
import { prisma } from "./db.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  const providers = [
    env.google ? "Google" : null,
    env.github ? "GitHub" : null,
    "email/password",
  ].filter(Boolean);

  console.log(
    [
      ``,
      `  Provenance API`,
      `  ──────────────────────────────────────────`,
      `  listening   http://localhost:${env.PORT}`,
      `  env         ${env.NODE_ENV}`,
      `  frontend    ${env.allowedOrigins.join(", ")}`,
      `  auth        ${providers.join(", ")}`,
      `  reviewer    ${env.LECTURER_INVITE_CODE ? "invite code enabled" : "elevation disabled"}`,
      ``,
    ].join("\n")
  );
});

/** Finish in-flight requests and let go of the pool before exiting. */
const shutdown = async (signal: string) => {
  console.log(`\n${signal} received — shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Don't hang forever on a stuck connection.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
