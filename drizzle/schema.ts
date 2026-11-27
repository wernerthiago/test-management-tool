import { mysqlEnum, mysqlTable, text, timestamp, varchar, int, boolean, index } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: text("name"),
  email: varchar("email", { length: 320 }).unique(), // login identifier: an email, or "admin" for the seeded account
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  emailVerified: boolean("emailVerified").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Projects - top level organization for test cases
 */
export const projects = mysqlTable("projects", {
  id: varchar("id", { length: 64 }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
});

export type Project = typeof projects.$inferSelect;
export type InsertProject = typeof projects.$inferInsert;

/**
 * Folders/Sections for organizing test cases hierarchically
 */
export const folders = mysqlTable("folders", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  parentId: varchar("parentId", { length: 64 }), // null for root folders
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
  parentIdx: index("parent_idx").on(table.parentId),
}));

export type Folder = typeof folders.$inferSelect;
export type InsertFolder = typeof folders.$inferInsert;

/**
 * Custom field definitions for test cases
 */
export const customFields = mysqlTable("customFields", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  fieldType: mysqlEnum("fieldType", ["text", "number", "dropdown", "multiselect", "date", "checkbox"]).notNull(),
  options: text("options"), // JSON array for dropdown/multiselect
  isRequired: boolean("isRequired").default(false),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
}));

export type CustomField = typeof customFields.$inferSelect;
export type InsertCustomField = typeof customFields.$inferInsert;

/**
 * Test cases
 */
export const testCases = mysqlTable("testCases", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  testCaseNumber: int("testCaseNumber").notNull(), // Auto-incrementing number per project (TC-1, TC-2, etc.)
  folderId: varchar("folderId", { length: 64 }),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  preconditions: text("preconditions"),
  testType: mysqlEnum("testType", ["manual", "automated"]).default("manual").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
  folderIdx: index("folder_idx").on(table.folderId),
}));

export type TestCase = typeof testCases.$inferSelect;
export type InsertTestCase = typeof testCases.$inferInsert;

/**
 * Test steps (for traditional step-based tests)
 */
export const testSteps = mysqlTable("testSteps", {
  id: varchar("id", { length: 64 }).primaryKey(),
  testCaseId: varchar("testCaseId", { length: 64 }).notNull(),
  stepNumber: int("stepNumber").notNull(),
  action: text("action").notNull(),
  expectedResult: text("expectedResult"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  testCaseIdx: index("testcase_idx").on(table.testCaseId),
}));

export type TestStep = typeof testSteps.$inferSelect;
export type InsertTestStep = typeof testSteps.$inferInsert;

/**
 * Gherkin scenarios (for BDD tests)
 */
export const gherkinScenarios = mysqlTable("gherkinScenarios", {
  id: varchar("id", { length: 64 }).primaryKey(),
  testCaseId: varchar("testCaseId", { length: 64 }).notNull(),
  feature: text("feature"),
  scenario: text("scenario").notNull(),
  given: text("given"),
  when: text("when"),
  then: text("then"),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  testCaseIdx: index("testcase_idx").on(table.testCaseId),
}));

export type GherkinScenario = typeof gherkinScenarios.$inferSelect;
export type InsertGherkinScenario = typeof gherkinScenarios.$inferInsert;

/**
 * Custom field values for test cases
 */
export const testCaseCustomFieldValues = mysqlTable("testCaseCustomFieldValues", {
  id: varchar("id", { length: 64 }).primaryKey(),
  testCaseId: varchar("testCaseId", { length: 64 }).notNull(),
  customFieldId: varchar("customFieldId", { length: 64 }).notNull(),
  value: text("value").notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
}, (table) => ({
  testCaseIdx: index("testcase_idx").on(table.testCaseId),
  customFieldIdx: index("customfield_idx").on(table.customFieldId),
}));

export type TestCaseCustomFieldValue = typeof testCaseCustomFieldValues.$inferSelect;
export type InsertTestCaseCustomFieldValue = typeof testCaseCustomFieldValues.$inferInsert;

/**
 * Test runs
 */
export const testRuns = mysqlTable("testRuns", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  runNumber: int("runNumber").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
}));

export type TestRun = typeof testRuns.$inferSelect;
export type InsertTestRun = typeof testRuns.$inferInsert;

/**
 * Test executions - individual test case results within a run
 */
export const testExecutions = mysqlTable("testExecutions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  testRunId: varchar("testRunId", { length: 64 }).notNull(),
  testCaseId: varchar("testCaseId", { length: 64 }).notNull(),
  status: mysqlEnum("status", ["not_run", "passed", "failed", "blocked", "skipped"]).default("not_run").notNull(),
  executedBy: varchar("executedBy", { length: 64 }),
  executedAt: timestamp("executedAt"),
  duration: int("duration"), // in milliseconds
  comment: text("comment"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow(),
}, (table) => ({
  testRunIdx: index("testrun_idx").on(table.testRunId),
  testCaseIdx: index("testcase_idx").on(table.testCaseId),
}));

export type TestExecution = typeof testExecutions.$inferSelect;
export type InsertTestExecution = typeof testExecutions.$inferInsert;


/**
 * Audit log for tracking test case changes
 */
export const testCaseAuditLog = mysqlTable("testCaseAuditLog", {
  id: varchar("id", { length: 64 }).primaryKey(),
  testCaseId: varchar("testCaseId", { length: 64 }).notNull(),
  userId: varchar("userId", { length: 64 }).notNull(),
  action: varchar("action", { length: 50 }).notNull(), // "created", "updated", "deleted"
  fieldName: varchar("fieldName", { length: 100 }), // Field that was changed
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  timestamp: timestamp("timestamp").defaultNow(),
}, (table) => ({
  testCaseIdx: index("testcase_idx").on(table.testCaseId),
  timestampIdx: index("timestamp_idx").on(table.timestamp),
}));

export type TestCaseAuditLog = typeof testCaseAuditLog.$inferSelect;
export type InsertTestCaseAuditLog = typeof testCaseAuditLog.$inferInsert;


/**
 * API tokens for the Playwright reporter endpoint. Each token belongs to one project;
 * only a SHA-256 hash is stored, the token itself is shown once at creation.
 */
export const apiTokens = mysqlTable("apiTokens", {
  id: varchar("id", { length: 64 }).primaryKey(),
  projectId: varchar("projectId", { length: 64 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  tokenPrefix: varchar("tokenPrefix", { length: 16 }).notNull(), // shown in the UI to tell tokens apart
  createdBy: varchar("createdBy", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow(),
  lastUsedAt: timestamp("lastUsedAt"),
}, (table) => ({
  projectIdx: index("project_idx").on(table.projectId),
}));

export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = typeof apiTokens.$inferInsert;
