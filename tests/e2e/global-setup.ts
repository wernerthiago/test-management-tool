import { FullConfig } from '@playwright/test';
import { spawn, ChildProcess } from 'child_process';
import mysql from 'mysql2/promise';
import net from 'net';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.listen(port, () => server.close(() => resolve(true)));
  });
}

async function waitForHealth(url: string, timeout = 30000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(url + '/health');
      if (res.ok) return;
    } catch (e) {
      // ignore
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('App did not become healthy in time: ' + url);
}

export default async function globalSetup(config: FullConfig) {
  // Create unique DB name per worker/process using timestamp
  const dbName = `test_db_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const root = process.env.DB_ROOT_PASSWORD || 'root_password';
  const user = process.env.DB_USER || 'test_user';
  const password = process.env.DB_PASSWORD || 'test_password';
  const host = process.env.DB_HOST || '127.0.0.1';
  const dbPort = Number(process.env.DB_PORT || 3306);

  // Connect to MySQL as root and create the database and user
  const conn = await mysql.createConnection({ host, port: dbPort, user: 'root', password: root });
  await conn.query(`CREATE DATABASE \`${dbName}\`;`);
  try {
    await conn.query(`CREATE USER IF NOT EXISTS '${user}'@'%' IDENTIFIED BY '${password}';`);
  } catch (e) {
    // ignore
  }
  await conn.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${user}'@'%';`);
  await conn.end();

  // Set DATABASE_URL for the app and drizzle
  const databaseUrl = `mysql://${user}:${password}@${host}:${dbPort}/${dbName}`;
  process.env.DATABASE_URL = databaseUrl;

  // Ensure a JWT_SECRET is set for signing session cookies in tests
  if (!process.env.JWT_SECRET || (process.env.JWT_SECRET || '').length < 32) {
    // Use a secure random-ish secret for tests
    process.env.JWT_SECRET = (process.env.JWT_SECRET || '') + 'test_secret_'.padEnd(32, 'x');
  }

  // The app applies migrations itself at startup (server/_core/index.ts)

  // Start the app on a worker-specific port to allow parallelism on the same host
  const workerIndex = Number(process.env.PW_WORKER_INDEX || 0);
  const basePort = 3000;
  const port = basePort + workerIndex;
  if (!(await isPortFree(port))) {
    throw new Error(`Port ${port} is already in use (is \`pnpm dev\` running?). Stop it, or run with PW_WORKER_INDEX=<n> to use port ${basePort}+n.`);
  }

  const appProcess: ChildProcess = spawn('npx', ['tsx', 'server/_core/index.ts'], {
    cwd: path.resolve(__dirname, '../../'),
    // Run in development to serve the client through Vite dev middleware
    env: { ...process.env, NODE_ENV: 'development', PORT: String(port) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  // Capture stdout/stderr for diagnostics
  let appUrl = `http://localhost:${port}`;
  appProcess.stdout?.on('data', (chunk) => {
    const text = chunk.toString();
    process.stdout.write(text);
  });
  appProcess.stderr?.on('data', (d) => process.stderr.write(d));

  // Wait for health, failing fast if the app exits (e.g. a migration error)
  await Promise.race([
    waitForHealth(appUrl, 60000),
    new Promise<never>((_, reject) => appProcess.once('exit', (code) => reject(new Error(`App exited with code ${code} before becoming healthy`)))),
  ]);

  // Save state for teardown and for tests
  const state = { dbName, databaseUrl, baseUrl: appUrl, jwtSecret: process.env.JWT_SECRET };
  // Write to file for globalTeardown to read
  const fs = await import('fs');
  fs.writeFileSync(path.resolve(__dirname, './global-state.json'), JSON.stringify(state));

  // Expose baseURL to tests via environment variable
  process.env.BASE_URL = appUrl;

  // Store app PID in state file
  fs.writeFileSync(path.resolve(__dirname, './global-app-pid'), String((appProcess.pid || '')));
}
