import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { appRouter } from "../routers";
import { createContext } from "./context";
import playwrightReporter from "../playwrightReporter";
import authRouter, { ensureDefaultAdmin } from "../authRouter";
import { getDb } from "../db";
import { serveStatic, setupVite } from "./vite";
import { validateEnvironment, getEnvSummary } from "../utils/env-validation";

/** Applies pending migrations from ./drizzle, so a new version only needs a restart to update the schema. */
async function migrateDatabase() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to the database (check DATABASE_URL)");
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  console.log("[Database] Migrations applied");
}

async function startServer() {
  // Validate environment variables on startup
  validateEnvironment();
  await migrateDatabase();
  await ensureDefaultAdmin();

  const app = express();
  const server = createServer(app);
  // Number of reverse proxies in front of the app (e.g. 1 behind an ingress), so client IPs are real
  const trustProxy = Number(process.env.TRUST_PROXY || 0);
  if (trustProxy > 0) app.set("trust proxy", trustProxy);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: getEnvSummary(),
    });
  });
  // Playwright reporter API
  app.use("/api/playwright", playwrightReporter);
  // Email/username + password login
  app.use("/api/auth", authRouter);
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Fail instead of silently moving to another port: health checks and clients expect this one
  const port = parseInt(process.env.PORT || "3000");
  server.on("error", err => {
    console.error(`Could not listen on port ${port}:`, err.message);
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
