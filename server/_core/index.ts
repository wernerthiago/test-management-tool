import "dotenv/config";
import express from "express";
import { createServer } from "http";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { migrate } from "drizzle-orm/mysql2/migrator";
import mysql from "mysql2/promise";
import { appRouter } from "../routers";
import { createContext } from "./context";
import playwrightReporter from "../playwrightReporter";
import authRouter, { ensureDefaultAdmin } from "../authRouter";
import { closeDb, getDb, pingDb } from "../db";
import { serveStatic, setupVite } from "./vite";
import { validateEnvironment, getEnvSummary } from "../utils/env-validation";

const STARTUP_LOCK = "qualityloom_startup";
const STARTUP_LOCK_TIMEOUT_S = 300;
const SHUTDOWN_TIMEOUT_MS = 10_000;

/**
 * Applies pending migrations from ./drizzle and seeds the first admin, holding a MySQL named lock so that
 * several replicas starting together take turns: the first migrates, the others wait and then find nothing to do.
 */
async function prepareDatabase() {
  const db = await getDb();
  if (!db) throw new Error("Could not connect to the database (check DATABASE_URL)");

  // GET_LOCK is held by a session, so it needs its own connection for the whole critical section
  const lockConnection = await mysql.createConnection(process.env.DATABASE_URL!);
  try {
    const [rows] = await lockConnection.query("SELECT GET_LOCK(?, ?) AS acquired", [STARTUP_LOCK, STARTUP_LOCK_TIMEOUT_S]);
    if ((rows as Array<{ acquired: number | null }>)[0]?.acquired !== 1) {
      throw new Error(`Timed out after ${STARTUP_LOCK_TIMEOUT_S}s waiting for another instance to finish migrating`);
    }
    await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
    console.log("[Database] Migrations applied");
    await ensureDefaultAdmin();
  } finally {
    await lockConnection.query("SELECT RELEASE_LOCK(?)", [STARTUP_LOCK]).catch(() => {});
    await lockConnection.end();
  }
}

async function startServer() {
  // Validate environment variables on startup
  validateEnvironment();
  await prepareDatabase();

  const app = express();
  const server = createServer(app);
  // Number of reverse proxies in front of the app (e.g. 1 behind an ingress), so client IPs are real
  const trustProxy = Number(process.env.TRUST_PROXY || 0);
  if (trustProxy > 0) app.set("trust proxy", trustProxy);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Liveness: the process is up and serving requests (does not touch the database)
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: getEnvSummary(),
    });
  });
  // Readiness: the database answers; 503 while it does not, so load balancers stop sending traffic
  app.get("/health/ready", async (req, res) => {
    const database = await pingDb();
    res.status(database ? 200 : 503).json({ status: database ? "ready" : "unavailable", database });
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
      // Unexpected failures only; auth and validation errors are normal traffic
      onError: ({ error, path }) => {
        if (error.code === "INTERNAL_SERVER_ERROR") {
          console.error(`[tRPC] ${path ?? "<unknown>"} failed:`, error.cause ?? error);
        }
      },
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

  // Graceful shutdown: stop accepting connections, let in-flight requests finish, close the DB pool
  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[Server] ${signal} received, shutting down`);
    const forceExit = setTimeout(() => {
      console.error(`[Server] Requests still open after ${SHUTDOWN_TIMEOUT_MS / 1000}s, exiting anyway`);
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();
    server.close(async () => {
      await closeDb().catch(() => {});
      console.log("[Server] Stopped");
      process.exit(0);
    });
    // Dev keeps Vite's HMR websocket open; there is no in-flight work worth waiting for
    if (process.env.NODE_ENV === "development") server.closeAllConnections();
    else server.closeIdleConnections();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

startServer().catch(error => {
  console.error(error);
  process.exit(1);
});
