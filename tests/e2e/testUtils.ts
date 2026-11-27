import mysql from 'mysql2/promise';
import { nanoid } from 'nanoid';
import path from 'path';
import fs from 'fs';
import { SignJWT } from 'jose';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function readGlobalState() {
  const statePath = path.resolve(__dirname, './global-state.json');
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8')) as any;
  } catch (e) {
    return null;
  }
}

async function waitForGlobalState(timeoutMs = 20000) {
  const statePath = path.resolve(__dirname, './global-state.json');
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (fs.existsSync(statePath)) return statePath;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

async function resolveConnectionConfig(databaseUrl?: string) {
  let url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) {
    const statePath = await waitForGlobalState();
    if (statePath) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
        url = state.databaseUrl || state.databaseURL || url;
      } catch (e) {
        // ignore
      }
    }
  }
  if (!url) throw new Error('DATABASE_URL not set for testUtils');
  const m = url.match(/mysql:\/\/(.*?):(.*?)@(.*?):(\d+)\/(.*)/);
  if (!m) throw new Error('Invalid DATABASE_URL format');
  const parsed = {
    user: m[1],
    password: m[2],
    host: m[3],
    port: Number(m[4]),
    database: m[5],
  };
  if (process.env.DB_USER) parsed.user = process.env.DB_USER;
  if (process.env.DB_PASSWORD) parsed.password = process.env.DB_PASSWORD;
  return parsed;
}

async function connect() {
  const cfg = await resolveConnectionConfig();
  return mysql.createConnection({ host: cfg.host, port: cfg.port, user: cfg.user ?? 'root', password: cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password', database: cfg.database });
}

/** Low bcrypt cost keeps tests fast; the app verifies any cost. */
export const hashTestPassword = (password: string) => bcrypt.hash(password, 4);

export async function createTestUser({ id, name, email, password, role, mustChangePassword }: { id?: string; name?: string; email?: string; password?: string; role?: 'admin' | 'user'; mustChangePassword?: boolean }) {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  const userId = id ?? nanoid();
  const userEmail = (email ?? `${userId}@example.com`).toLowerCase();
  const passwordHash = password ? await hashTestPassword(password) : '';
  await conn.query('INSERT INTO users (id, name, email, passwordHash, role, mustChangePassword) VALUES (?, ?, ?, ?, ?, ?)', [userId, name ?? 'Test User', userEmail, passwordHash, role ?? 'user', mustChangePassword ? 1 : 0]);
  await conn.end();
  return { id: userId, name: name ?? 'Test User', email: userEmail };
}

export async function createTestProject({ id, name, createdBy }: { id?: string; name?: string; createdBy?: string }) {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  const projectId = id ?? nanoid();
  await conn.query('INSERT INTO projects (id, name, description, createdBy) VALUES (?, ?, ?, ?)', [projectId, name ?? 'Test Project', '', createdBy ?? '']);
  await conn.end();
  return { id: projectId, name };
}

export async function createSessionCookieForUser(userId: string, opts?: { name?: string; expiresInMs?: number }) {
  const state = await readGlobalState();
  const secret = process.env.JWT_SECRET || state?.jwtSecret || 'test_jwt_secret';
  const issuedAt = Date.now();
  const expiresInMs = opts?.expiresInMs ?? 1000 * 60 * 60 * 24 * 365;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);

  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime(expirationSeconds)
    .sign(new TextEncoder().encode(secret));

  return token;
}

export async function createCustomField({
  id,
  projectId,
  name,
  fieldType,
  options,
  isRequired,
}: {
  id?: string;
  projectId: string;
  name: string;
  fieldType: 'text' | 'number' | 'dropdown' | 'multiselect' | 'date' | 'checkbox';
  options?: string;
  isRequired?: boolean;
}) {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  const fieldId = id ?? nanoid();
  await conn.query('INSERT INTO customFields (id, projectId, name, fieldType, options, isRequired) VALUES (?, ?, ?, ?, ?, ?)', [fieldId, projectId, name, fieldType, options ?? null, isRequired ?? false]);
  await conn.end();
  return { id: fieldId, projectId, name, fieldType, options };
}

export async function clearAllTables() {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  const tables = ['testExecutions','testRuns','testCaseCustomFieldValues','gherkinScenarios','testSteps','testCases','folders','projects','users','customFields'];
  for (const t of tables) {
    try { await conn.query(`DELETE FROM ${t}`); } catch (e) { /* ignore */ }
  }
  await conn.end();
}

export async function createTestRun({
  id,
  projectId,
  runNumber,
  name,
  description,
  createdBy,
}: {
  id?: string;
  projectId: string;
  runNumber?: number;
  name: string;
  description?: string;
  createdBy: string;
}) {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  
  const testRunId = id ?? nanoid();
  const runNum = runNumber ?? 1;
  
  await conn.query(
    'INSERT INTO testRuns (id, projectId, runNumber, name, description, createdBy) VALUES (?, ?, ?, ?, ?, ?)',
    [testRunId, projectId, runNum, name, description ?? null, createdBy]
  );
  
  await conn.end();
  return { id: testRunId, projectId, runNumber: runNum, name };
}

export async function createTestCase({
  id,
  projectId,
  caseNumber,
  title,
  description,
  preconditions,
  createdBy,
  folderId,
}: {
  id?: string;
  projectId: string;
  caseNumber?: number;
  title: string;
  description?: string;
  preconditions?: string;
  createdBy: string;
  folderId?: string | null;
}) {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  
  const testCaseId = id ?? nanoid();
  const caseNum = caseNumber ?? 1;
  
  await conn.query(
    'INSERT INTO testCases (id, projectId, testCaseNumber, title, description, preconditions, createdBy, folderId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [testCaseId, projectId, caseNum, title, description ?? null, preconditions ?? null, createdBy, folderId ?? null]
  );
  
  await conn.end();
  return { id: testCaseId, projectId, caseNumber: caseNum, title };
}

export async function createTestExecution({
  id,
  testRunId,
  testCaseId,
  status,
  executedBy,
  executedAt,
}: {
  id?: string;
  testRunId: string;
  testCaseId: string;
  status?: 'not_run' | 'passed' | 'failed' | 'blocked' | 'skipped';
  executedBy?: string;
  executedAt?: Date;
}) {
  const cfg = await resolveConnectionConfig();
  const user = cfg.user ?? 'root';
  const pwd = cfg.password ?? process.env.DB_ROOT_PASSWORD ?? 'root_password';
  const conn = await mysql.createConnection({ host: cfg.host, port: cfg.port, user, password: pwd, database: cfg.database });
  
  const executionId = id ?? nanoid();
  const execStatus = status ?? 'not_run';
  
  await conn.query(
    'INSERT INTO testExecutions (id, testRunId, testCaseId, status, executedBy, executedAt) VALUES (?, ?, ?, ?, ?, ?)',
    [executionId, testRunId, testCaseId, execStatus, executedBy ?? null, executedAt ?? null]
  );
  
  await conn.end();
  return { id: executionId, testRunId, testCaseId, status: execStatus };
}


/** Sets a user's password (and whether it must be changed at next login), looked up by login identifier. */
export async function setUserPassword(login: string, password: string, mustChangePassword: boolean) {
  const conn = await connect();
  await conn.query('UPDATE users SET passwordHash = ?, mustChangePassword = ? WHERE email = ?', [await hashTestPassword(password), mustChangePassword ? 1 : 0, login]);
  await conn.end();
}

export async function getUserByLogin(login: string) {
  const conn = await connect();
  const [rows] = await conn.query('SELECT id, name, email, role, mustChangePassword FROM users WHERE email = ?', [login]);
  await conn.end();
  return (rows as any[])[0] ?? null;
}

export async function deleteUserById(id: string) {
  const conn = await connect();
  await conn.query('DELETE FROM users WHERE id = ?', [id]);
  await conn.end();
}

export async function deleteUserByLogin(login: string) {
  const conn = await connect();
  await conn.query('DELETE FROM users WHERE email = ?', [login]);
  await conn.end();
}

/** Base URL of the app started by global setup. */
export async function resolveBaseUrl() {
  if (process.env.BASE_URL) return process.env.BASE_URL;
  const state = await readGlobalState();
  return state?.baseUrl || 'http://localhost:3000';
}

/** Signs the browser context in as the given user by setting a session cookie. */
export async function signInAs(page: import('@playwright/test').Page, userId: string) {
  const token = await createSessionCookieForUser(userId);
  await page.context().addCookies([
    { name: 'app_session_id', value: token, domain: 'localhost', path: '/', httpOnly: true, secure: false },
  ]);
}
