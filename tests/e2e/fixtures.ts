import { test as base, expect } from '@playwright/test';
import * as utils from './testUtils';

type TestFixtures = {
  testUser: { id: string; name?: string; email?: string };
  utils: typeof utils;
};

export const test = base.extend<TestFixtures>({
  utils: async ({}, use) => {
    await use(utils);
  },

  testUser: async ({ utils }, use) => {
    const u = await utils.createTestUser({});
    await use(u);
    // cleanup single user after test
    // tests should prefer DB-level clearAllTables in global teardown or per-test cleanup
  },
});

export { expect };
