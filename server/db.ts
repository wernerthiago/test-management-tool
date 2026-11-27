import { eq, desc, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { nanoid } from "nanoid";
import {
  InsertUser,
  users,
  projects,
  InsertProject,
  folders,
  InsertFolder,
  customFields,
  InsertCustomField,
  testCases,
  InsertTestCase,
  testSteps,
  InsertTestStep,
  gherkinScenarios,
  InsertGherkinScenario,
  testCaseCustomFieldValues,
  InsertTestCaseCustomFieldValue,
  testRuns,
  InsertTestRun,
  testExecutions,
  InsertTestExecution,
  testCaseAuditLog,
  InsertTestCaseAuditLog,
} from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ===== Projects =====
export async function createProject(project: InsertProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(projects).values(project);
  return project;
}

/** Every logged-in user can open every project. */
export async function getAllProjects() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(projects).orderBy(desc(projects.createdAt));
}

export async function getProjectById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
  return result[0];
}

export async function updateProject(id: string, data: Partial<InsertProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(projects).set(data).where(eq(projects.id, id));
}

export async function deleteProject(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(projects).where(eq(projects.id, id));
}

// ===== Folders =====
export async function createFolder(folder: InsertFolder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(folders).values(folder);
  return folder;
}

export async function getFoldersByProject(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(folders).where(eq(folders.projectId, projectId));
}

export async function deleteFolder(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(folders).where(eq(folders.id, id));
}

// ===== Custom Fields =====
export async function createCustomField(field: InsertCustomField) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(customFields).values(field);
  return field;
}

export async function updateCustomField(id: string, updates: Partial<Omit<InsertCustomField, 'id' | 'projectId'>>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(customFields).set(updates).where(eq(customFields.id, id));
}

export async function getCustomFieldsByProject(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(customFields).where(eq(customFields.projectId, projectId));
}

export async function deleteCustomField(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(customFields).where(eq(customFields.id, id));
}

// ===== Test Cases =====
export async function getNextTestCaseNumber(projectId: string): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .select({ maxNumber: sql<number>`MAX(${testCases.testCaseNumber})` })
    .from(testCases)
    .where(eq(testCases.projectId, projectId));
  
  const maxNumber = result[0]?.maxNumber || 0;
  return maxNumber + 1;
}

export async function createTestCase(testCase: InsertTestCase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(testCases).values(testCase);
  return testCase;
}

export async function getTestCasesByProject(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testCases).where(eq(testCases.projectId, projectId)).orderBy(desc(testCases.createdAt));
}

export async function getTestCasesByFolder(folderId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testCases).where(eq(testCases.folderId, folderId));
}

export async function getTestCaseById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testCases).where(eq(testCases.id, id)).limit(1);
  return result[0];
}

export async function updateTestCase(id: string, data: Partial<InsertTestCase>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testCases).set(data).where(eq(testCases.id, id));
}

export async function deleteTestCase(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testCases).where(eq(testCases.id, id));
}

// ===== Test Steps =====
export async function createTestStep(step: InsertTestStep) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(testSteps).values(step);
  return step;
}

export async function getTestStepsByTestCase(testCaseId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testSteps).where(eq(testSteps.testCaseId, testCaseId)).orderBy(testSteps.stepNumber);
}

// ===== Gherkin Scenarios =====
export async function createGherkinScenario(scenario: InsertGherkinScenario) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(gherkinScenarios).values(scenario);
  return scenario;
}

export async function getGherkinScenarioByTestCase(testCaseId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(gherkinScenarios).where(eq(gherkinScenarios.testCaseId, testCaseId)).limit(1);
  return result[0];
}

// ===== Test Case Custom Field Values =====
export async function createCustomFieldValue(value: InsertTestCaseCustomFieldValue) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(testCaseCustomFieldValues).values(value);
  return value;
}

export async function getCustomFieldValuesByTestCase(testCaseId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testCaseCustomFieldValues).where(eq(testCaseCustomFieldValues.testCaseId, testCaseId));
}

export async function deleteCustomFieldValuesByTestCase(testCaseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testCaseCustomFieldValues).where(eq(testCaseCustomFieldValues.testCaseId, testCaseId));
}

// ===== Test Runs =====
export async function createTestRun(run: InsertTestRun) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Auto-generate runNumber if not provided
  if (!run.runNumber) {
    try {
      const existingRuns = await db
        .select({ runNumber: testRuns.runNumber })
        .from(testRuns)
        .where(eq(testRuns.projectId, run.projectId))
        .orderBy(desc(testRuns.runNumber))
        .limit(1);
      
      run.runNumber = existingRuns.length > 0 && existingRuns[0].runNumber ? existingRuns[0].runNumber + 1 : 1;
    } catch (error) {
      console.error("Failed to get existing run numbers, defaulting to 1:", error);
      run.runNumber = 1;
    }
  }
  
  await db.insert(testRuns).values(run);
  return run;
}

export async function getTestRunsByProject(projectId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testRuns).where(eq(testRuns.projectId, projectId)).orderBy(desc(testRuns.createdAt));
}

export async function getTestRunById(id: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(testRuns).where(eq(testRuns.id, id)).limit(1);
  return result[0];
}

export async function updateTestRun(id: string, data: Partial<InsertTestRun>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testRuns).set(data).where(eq(testRuns.id, id));
}

export async function deleteTestRun(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testRuns).where(eq(testRuns.id, id));
}

// ===== Test Executions =====
export async function createTestExecution(execution: InsertTestExecution) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(testExecutions).values(execution);
  return execution;
}

export async function getTestExecutionsByRun(testRunId: string) {
  const db = await getDb();
  if (!db) return [];
  const results = await db
    .select({
      id: testExecutions.id,
      testRunId: testExecutions.testRunId,
      testCaseId: testExecutions.testCaseId,
      testCaseNumber: testCases.testCaseNumber,
      testCaseTitle: testCases.title,
      status: testExecutions.status,
      executedBy: testExecutions.executedBy,
      executedAt: testExecutions.executedAt,
      duration: testExecutions.duration,
      comment: testExecutions.comment,
    })
    .from(testExecutions)
    .leftJoin(testCases, eq(testExecutions.testCaseId, testCases.id))
    .where(eq(testExecutions.testRunId, testRunId));
  return results;
}

export async function getTestExecutionsByTestCase(testCaseId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testExecutions).where(eq(testExecutions.testCaseId, testCaseId)).orderBy(desc(testExecutions.executedAt));
}

export async function updateTestExecution(id: string, data: Partial<InsertTestExecution>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(testExecutions).set(data).where(eq(testExecutions.id, id));
}

export async function deleteTestExecution(id: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(testExecutions).where(eq(testExecutions.id, id));
}

// ===== Dashboard & Analytics =====
export async function getTestExecutionStats(projectId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select({
      status: testExecutions.status,
      count: sql<number>`count(*)`,
    })
    .from(testExecutions)
    .innerJoin(testRuns, eq(testExecutions.testRunId, testRuns.id))
    .where(eq(testRuns.projectId, projectId))
    .groupBy(testExecutions.status);

  return result;
}

export async function getTestCaseCountByFolder(projectId: string) {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      folderId: testCases.folderId,
      count: sql<number>`count(*)`,
    })
    .from(testCases)
    .where(eq(testCases.projectId, projectId))
    .groupBy(testCases.folderId);

  return result;
}

// ===== Test Case Audit Log =====
export async function createAuditLog(log: InsertTestCaseAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(testCaseAuditLog).values(log);
  return log;
}

export async function getAuditLogByTestCase(testCaseId: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(testCaseAuditLog).where(eq(testCaseAuditLog.testCaseId, testCaseId)).orderBy(desc(testCaseAuditLog.timestamp));
}

// ===== Invites =====
// ==================== Users ====================

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getUserById(userId: string) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user || null;
}

/** Looks up a user by login identifier (an email, or "admin" for the seeded account). */
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return null;
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return user || null;
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(users).values(user);
  return user;
}

export async function updateUserPassword(userId: string, passwordHash: string, mustChangePassword: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ passwordHash, mustChangePassword }).where(eq(users.id, userId));
}

export async function updateUserRole(userId: string, role: "admin" | "user") {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function touchLastSignedIn(userId: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId));
}

export async function countAdmins() {
  const db = await getDb();
  if (!db) return 0;
  const [row] = await db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "admin"));
  return Number(row?.count ?? 0);
}

export async function deleteUser(userId: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(users).where(eq(users.id, userId));
}
