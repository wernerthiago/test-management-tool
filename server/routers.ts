import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { toPublicUser } from "./_core/auth";
import { adminProcedure, authedProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import * as db from "./db";
import { TRPCError } from "@trpc/server";
import { comparePassword, hashPassword, validatePasswordStrength } from "./utils/password";
import { apiTokenDisplayPrefix, generateApiToken, hashApiToken } from "./utils/apiToken";

const roleSchema = z.enum(["admin", "user"]);
const temporaryPasswordSchema = z.string().min(8, "Temporary password must be at least 8 characters");

/** Refuses changes that would leave QualityLoom without any admin. */
async function assertNotLastAdmin(userId: string) {
  const target = await db.getUserById(userId);
  if (target?.role === "admin" && (await db.countAdmins()) <= 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "QualityLoom must keep at least one admin" });
  }
}

export const appRouter = router({
  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? toPublicUser(ctx.user) : null)),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
    changePassword: authedProcedure
      .input(z.object({ currentPassword: z.string().min(1), newPassword: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user.passwordHash || !(await comparePassword(input.currentPassword, ctx.user.passwordHash))) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Current password is incorrect" });
        }
        if (input.newPassword === input.currentPassword) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "New password must be different from the current one" });
        }
        const strength = validatePasswordStrength(input.newPassword);
        if (!strength.valid) {
          throw new TRPCError({ code: "BAD_REQUEST", message: strength.errors.join(". ") });
        }
        await db.updateUserPassword(ctx.user.id, await hashPassword(input.newPassword), false);
        return { success: true } as const;
      }),
  }),

  admin: router({
    listUsers: adminProcedure.query(async () => (await db.getAllUsers()).map(toPublicUser)),

    createUser: adminProcedure
      .input(
        z.object({
          name: z.string().trim().min(1, "Name is required").max(255),
          email: z.string().trim().toLowerCase().email("Invalid email address"),
          role: roleSchema,
          temporaryPassword: temporaryPasswordSchema,
        })
      )
      .mutation(async ({ input }) => {
        if (await db.getUserByEmail(input.email)) {
          throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
        }
        const id = nanoid();
        await db.createUser({
          id,
          name: input.name,
          email: input.email,
          role: input.role,
          passwordHash: await hashPassword(input.temporaryPassword),
          mustChangePassword: true,
        });
        return { id };
      }),

    updateRole: adminProcedure
      .input(z.object({ userId: z.string(), role: roleSchema }))
      .mutation(async ({ input }) => {
        if (input.role !== "admin") await assertNotLastAdmin(input.userId);
        await db.updateUserRole(input.userId, input.role);
        return { success: true } as const;
      }),

    resetPassword: adminProcedure
      .input(z.object({ userId: z.string(), temporaryPassword: temporaryPasswordSchema }))
      .mutation(async ({ input }) => {
        if (!(await db.getUserById(input.userId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
        }
        await db.updateUserPassword(input.userId, await hashPassword(input.temporaryPassword), true);
        return { success: true } as const;
      }),

    deleteUser: adminProcedure
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot delete your own account" });
        }
        await assertNotLastAdmin(input.userId);
        await db.deleteUser(input.userId);
        return { success: true } as const;
      }),
  }),

  apiTokens: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => db.getApiTokensByProject(input.projectId)),

    /** Returns the token once; afterwards only its prefix can be shown. */
    create: protectedProcedure
      .input(z.object({ projectId: z.string(), name: z.string().trim().min(1, "Name is required").max(255) }))
      .mutation(async ({ ctx, input }) => {
        if (!(await db.getProjectById(input.projectId))) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
        }
        const token = generateApiToken();
        await db.createApiToken({
          id: nanoid(),
          projectId: input.projectId,
          name: input.name,
          tokenHash: hashApiToken(token),
          tokenPrefix: apiTokenDisplayPrefix(token),
          createdBy: ctx.user.id,
        });
        return { token };
      }),

    revoke: protectedProcedure
      .input(z.object({ id: z.string(), projectId: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteApiToken(input.id, input.projectId);
        return { success: true } as const;
      }),
  }),

  projects: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllProjects();
    }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1).max(255),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const projectId = nanoid();
        const project = {
          id: projectId,
          name: input.name,
          description: input.description || null,
          createdBy: ctx.user.id,
        };
        const createdProject = await db.createProject(project);
        
        // Create default custom fields for the project
        await db.createCustomField({
          id: nanoid(),
          projectId: projectId,
          name: "Priority",
          fieldType: "dropdown",
          options: "low,medium,high,critical",
          isRequired: false,
        });
        
        await db.createCustomField({
          id: nanoid(),
          projectId: projectId,
          name: "Type",
          fieldType: "dropdown",
          options: "manual,automated",
          isRequired: false,
        });
        
        return createdProject;
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return await db.getProjectById(input.id);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(255).optional(),
          description: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateProject(id, data);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteProject(input.id);
        return { success: true };
      }),
  }),

  folders: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        return await db.getFoldersByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          name: z.string().min(1).max(255),
          parentId: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const folder = {
          id: nanoid(),
          projectId: input.projectId,
          name: input.name,
          parentId: input.parentId || null,
        };
        return await db.createFolder(folder);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteFolder(input.id);
        return { success: true };
      }),
  }),

  customFields: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        return await db.getCustomFieldsByProject(input.projectId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          name: z.string().min(1).max(255),
          fieldType: z.enum(["text", "number", "dropdown", "multiselect", "date", "checkbox"]),
          options: z.string().optional(),
          isRequired: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const field = {
          id: nanoid(),
          projectId: input.projectId,
          name: input.name,
          fieldType: input.fieldType,
          options: input.options || null,
          isRequired: input.isRequired || false,
        };
        return await db.createCustomField(field);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string().min(1).max(255).optional(),
          fieldType: z.enum(["text", "number", "dropdown", "multiselect", "date", "checkbox"]).optional(),
          options: z.string().nullable().optional(),
          isRequired: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateCustomField(input.id, {
          name: input.name,
          fieldType: input.fieldType,
          options: input.options,
          isRequired: input.isRequired,
        });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteCustomField(input.id);
        return { success: true };
      }),
  }),

  testCases: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        const testCases = await db.getTestCasesByProject(input.projectId);
        
        // Fetch custom field values for each test case
        const testCasesWithCustomFields = await Promise.all(
          testCases.map(async (tc) => {
            const customFieldValues = await db.getCustomFieldValuesByTestCase(tc.id);
            const customFieldValuesMap: Record<string, string> = {};
            customFieldValues.forEach((cfv) => {
              customFieldValuesMap[cfv.customFieldId] = cfv.value;
            });
            
            return {
              ...tc,
              customFieldValues: customFieldValuesMap,
            };
          })
        );
        
        return testCasesWithCustomFields;
      }),

    listByFolder: protectedProcedure
      .input(z.object({ folderId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestCasesByFolder(input.folderId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const testCase = await db.getTestCaseById(input.id);
        if (!testCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Test case not found" });
        }

        const steps = await db.getTestStepsByTestCase(input.id);
        const gherkin = await db.getGherkinScenarioByTestCase(input.id);
        const customFieldValues = await db.getCustomFieldValuesByTestCase(input.id);

        return {
          ...testCase,
          steps,
          gherkin,
          customFieldValues,
        };
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          folderId: z.string().optional(),
          title: z.string().min(1).max(500),
          description: z.string().optional(),
          preconditions: z.string().optional(),
          testType: z.enum(["manual", "automated"]).optional(),
          priority: z.enum(["low", "medium", "high", "critical"]).optional(),
          steps: z
            .array(
              z.object({
                stepNumber: z.number(),
                action: z.string(),
                expectedResult: z.string().optional(),
              })
            )
            .optional(),
          gherkin: z
            .object({
              feature: z.string().optional(),
              scenario: z.string(),
              given: z.string().optional(),
              when: z.string().optional(),
              then: z.string().optional(),
            })
            .optional(),
          customFieldValues: z
            .array(
              z.object({
                customFieldId: z.string(),
                value: z.string(),
              })
            )
            .optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const testCaseId = nanoid();
        
        // Get the next test case number for this project
        const testCaseNumber = await db.getNextTestCaseNumber(input.projectId);
        
        const testCase = {
          id: testCaseId,
          projectId: input.projectId,
          testCaseNumber,
          folderId: input.folderId || null,
          title: input.title,
          description: input.description || null,
          preconditions: input.preconditions || null,
          testType: input.testType || "manual",
          priority: input.priority || "medium",
          createdBy: ctx.user.id,
        };

        await db.createTestCase(testCase);

        // Create steps if provided
        if (input.steps && input.steps.length > 0) {
          for (const step of input.steps) {
            await db.createTestStep({
              id: nanoid(),
              testCaseId,
              stepNumber: step.stepNumber,
              action: step.action,
              expectedResult: step.expectedResult || null,
            });
          }
        }

        // Create gherkin scenario if provided
        if (input.gherkin) {
          await db.createGherkinScenario({
            id: nanoid(),
            testCaseId,
            feature: input.gherkin.feature || null,
            scenario: input.gherkin.scenario,
            given: input.gherkin.given || null,
            when: input.gherkin.when || null,
            then: input.gherkin.then || null,
          });
        }

        // Create custom field values if provided
        if (input.customFieldValues && input.customFieldValues.length > 0) {
          for (const cfv of input.customFieldValues) {
            await db.createCustomFieldValue({
              id: nanoid(),
              testCaseId,
              customFieldId: cfv.customFieldId,
              value: cfv.value,
            });
          }
        }

        // Create initial audit log entry
        await db.createAuditLog({
          id: `${testCaseId}_${Date.now()}_created`,
          testCaseId,
          userId: ctx.user.id,
          action: "created",
          fieldName: "test case",
          oldValue: null,
          newValue: input.title,
          timestamp: new Date(),
        });

        return { id: testCaseId };
      }),

    bulkCreate: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          testCases: z.array(
            z.object({
              folderId: z.string().optional(),
              title: z.string().min(1).max(500),
              description: z.string().optional(),
              preconditions: z.string().optional(),
              testType: z.enum(["manual", "automated"]).optional(),
              priority: z.enum(["low", "medium", "high", "critical"]).optional(),
              steps: z
                .array(
                  z.object({
                    stepNumber: z.number(),
                    action: z.string(),
                    expectedResult: z.string().optional(),
                  })
                )
                .optional(),
            })
          ),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const createdIds: string[] = [];

        for (const tc of input.testCases) {
          const testCaseId = nanoid();
          const testCaseNumber = await db.getNextTestCaseNumber(input.projectId);
          const testCase = {
            id: testCaseId,
            projectId: input.projectId,
            testCaseNumber,
            folderId: tc.folderId || null,
            title: tc.title,
            description: tc.description || null,
            preconditions: tc.preconditions || null,
            testType: tc.testType || "manual",
            priority: tc.priority || "medium",
            createdBy: ctx.user.id,
          };

          await db.createTestCase(testCase);

          if (tc.steps && tc.steps.length > 0) {
            for (const step of tc.steps) {
              await db.createTestStep({
                id: nanoid(),
                testCaseId,
                stepNumber: step.stepNumber,
                action: step.action,
                expectedResult: step.expectedResult || null,
              });
            }
          }

          createdIds.push(testCaseId);
        }

        return { count: createdIds.length, ids: createdIds };
      }),

    getById: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const testCase = await db.getTestCaseById(input.id);
        if (!testCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Test case not found" });
        }
        
        // Get custom field values
        const customFieldValues = await db.getCustomFieldValuesByTestCase(input.id);
        const customFieldValuesMap: Record<string, string> = {};
        customFieldValues.forEach((cfv) => {
          customFieldValuesMap[cfv.customFieldId] = cfv.value;
        });
        
        return {
          ...testCase,
          customFieldValues: customFieldValuesMap,
        };
      }),

    getAuditLog: protectedProcedure
      .input(z.object({ testCaseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getAuditLogByTestCase(input.testCaseId);
      }),

    getExecutions: protectedProcedure
      .input(z.object({ testCaseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestExecutionsByTestCase(input.testCaseId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          title: z.string().min(1).max(500).optional(),
          description: z.string().optional(),
          preconditions: z.string().optional(),
          folderId: z.string().optional(),
          customFieldValues: z.array(
            z.object({
              customFieldId: z.string(),
              value: z.string(),
            })
          ).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const { id, customFieldValues, ...data } = input;
        
        // Get old test case for audit logging
        const oldTestCase = await db.getTestCaseById(id);
        if (!oldTestCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Test case not found" });
        }
        
        // Update test case
        await db.updateTestCase(id, data);
        
        // Log changes
        const userId = ctx.user.id;
        const timestamp = new Date();
        
        if (input.title && input.title !== oldTestCase.title) {
          await db.createAuditLog({
            id: `${id}_${Date.now()}_title`,
            testCaseId: id,
            userId,
            action: "updated",
            fieldName: "title",
            oldValue: oldTestCase.title,
            newValue: input.title,
            timestamp,
          });
        }
        
        if (input.description !== undefined && input.description !== oldTestCase.description) {
          await db.createAuditLog({
            id: `${id}_${Date.now()}_description`,
            testCaseId: id,
            userId,
            action: "updated",
            fieldName: "description",
            oldValue: oldTestCase.description || "",
            newValue: input.description,
            timestamp,
          });
        }
        
        if (input.preconditions !== undefined && input.preconditions !== oldTestCase.preconditions) {
          await db.createAuditLog({
            id: `${id}_${Date.now()}_preconditions`,
            testCaseId: id,
            userId,
            action: "updated",
            fieldName: "preconditions",
            oldValue: oldTestCase.preconditions || "",
            newValue: input.preconditions,
            timestamp,
          });
        }
        
        // Update custom field values and log changes
        if (customFieldValues) {
          // Fetch old custom field values
          const oldCFVs = await db.getCustomFieldValuesByTestCase(id);
          const oldMap: Record<string, string> = {};
          oldCFVs.forEach((c) => { oldMap[c.customFieldId] = c.value; });

          // Build new map
          const newMap: Record<string, string> = {};
          for (const cfv of customFieldValues) {
            newMap[cfv.customFieldId] = cfv.value;
          }

          // Fetch custom field definitions to show human-readable names
          const customFieldDefs = await db.getCustomFieldsByProject(oldTestCase.projectId);
          const fieldNameMap: Record<string, string> = {};
          customFieldDefs.forEach((f) => { fieldNameMap[f.id] = f.name; });

          // Compare and create audit logs for differences
          const allKeys = new Set<string>([...Object.keys(oldMap), ...Object.keys(newMap)]);
          for (const cfId of Array.from(allKeys)) {
            const oldVal = oldMap[cfId] ?? "";
            const newVal = newMap[cfId] ?? "";
            if (oldVal !== newVal) {
              await db.createAuditLog({
                id: `${id}_${cfId}_${Date.now()}`,
                testCaseId: id,
                userId,
                action: "updated",
                fieldName: fieldNameMap[cfId] || cfId,
                oldValue: oldVal,
                newValue: newVal,
                timestamp,
              });
            }
          }

          // Persist new values (replace existing)
          await db.deleteCustomFieldValuesByTestCase(id);
          for (const cfv of customFieldValues) {
            await db.createCustomFieldValue({
              id: `${id}_${cfv.customFieldId}_${Date.now()}`,
              testCaseId: id,
              customFieldId: cfv.customFieldId,
              value: cfv.value,
              createdAt: new Date(),
            });
          }
        }
        
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteTestCase(input.id);
        return { success: true };
      }),
  }),

  testRuns: router({
    list: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestRunsByProject(input.projectId);
      }),

    get: protectedProcedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        const run = await db.getTestRunById(input.id);
        if (!run) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Test run not found" });
        }

        const executions = await db.getTestExecutionsByRun(input.id);
        return { ...run, executions };
      }),

    create: protectedProcedure
      .input(
        z.object({
          projectId: z.string(),
          name: z.string().min(1).max(255),
          description: z.string().optional(),
          testCaseIds: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const runId = nanoid();
        const run = {
          id: runId,
          projectId: input.projectId,
          runNumber: 0, // Will be auto-generated by createTestRun
          name: input.name,
          description: input.description || null,
          createdBy: ctx.user.id,
        };

        await db.createTestRun(run);

        // Create test executions for each test case
        for (const testCaseId of input.testCaseIds) {
          await db.createTestExecution({
            id: nanoid(),
            testRunId: runId,
            testCaseId,
            status: "not_run",
            executedBy: null,
            executedAt: null,
            duration: null,
            comment: null,
            errorMessage: null,
          });
        }

        return { id: runId };
      }),

    updateExecution: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          status: z.enum(["not_run", "passed", "failed", "blocked", "skipped"]),
          comment: z.string().optional(),
          errorMessage: z.string().optional(),
          duration: z.number().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await db.updateTestExecution(id, {
          ...data,
          executedBy: ctx.user.id,
          executedAt: new Date(),
        });
        return { success: true };
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string(),
          testCaseIds: z.array(z.string()),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Update test run basic info
        await db.updateTestRun(input.id, {
          name: input.name,
          description: input.description,
        });

        // Get current executions
        const currentExecutions = await db.getTestExecutionsByRun(input.id);
        const currentTestCaseIds = currentExecutions.map(e => e.testCaseId);

        // Remove executions for test cases no longer selected
        for (const execution of currentExecutions) {
          if (!input.testCaseIds.includes(execution.testCaseId)) {
            await db.deleteTestExecution(execution.id);
          }
        }

        // Add executions for newly selected test cases
        for (const testCaseId of input.testCaseIds) {
          if (!currentTestCaseIds.includes(testCaseId)) {
            await db.createTestExecution({
              id: nanoid(),
              testRunId: input.id,
              testCaseId,
              status: "not_run",
              executedBy: null,
              executedAt: null,
              duration: null,
              comment: null,
              errorMessage: null,
            });
          }
        }

        return { success: true };
      }),

    complete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.updateTestRun(input.id, { completedAt: new Date() });
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input }) => {
        await db.deleteTestRun(input.id);
        return { success: true };
      }),
  }),

  analytics: router({
    executionStats: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestExecutionStats(input.projectId);
      }),

    testCasesByFolder: protectedProcedure
      .input(z.object({ projectId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestCaseCountByFolder(input.projectId);
      }),

    executionHistory: protectedProcedure
      .input(z.object({ testCaseId: z.string() }))
      .query(async ({ input }) => {
        return await db.getTestExecutionsByTestCase(input.testCaseId);
      }),
  }),
});

export type AppRouter = typeof appRouter;

