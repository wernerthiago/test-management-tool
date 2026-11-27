import path from 'path';
import fs from 'fs';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function globalTeardown() {
  const statePath = path.resolve(__dirname, './global-state.json');
  if (!fs.existsSync(statePath)) return;
  const state = JSON.parse(fs.readFileSync(statePath, 'utf-8')) as { dbName: string; databaseUrl: string };

  // Kill app process if PID file exists
  const pidFile = path.resolve(__dirname, './global-app-pid');
  if (fs.existsSync(pidFile)) {
    const pid = Number(fs.readFileSync(pidFile, 'utf-8'));
    try {
      process.kill(pid);
    } catch (e) {
      // ignore
    }
  }

  // Drop the test database
  try {
    const root = process.env.DB_ROOT_PASSWORD || 'root_password';
    const host = process.env.DB_HOST || '127.0.0.1';
    const port = Number(process.env.DB_PORT || 3306);
    const conn = await mysql.createConnection({ host, port, user: 'root', password: root });
    await conn.query(`DROP DATABASE IF EXISTS \`${state.dbName}\`;`);
    await conn.end();
  } catch (e) {
    console.warn('Failed to drop test database', e);
  }

  // Clean up files
  try { fs.unlinkSync(statePath); } catch (e) {}
  try { fs.unlinkSync(pidFile); } catch (e) {}
}
