import { test, expect } from './fixtures';
import { nanoid } from 'nanoid';
import type { APIRequestContext } from '@playwright/test';
import { ReporterSettingsPage } from './pages/ReporterSettingsPage';

const RESULTS = [
  { testCaseTitle: 'Reporter passes', status: 'passed', duration: 120 },
  { testCaseTitle: 'Reporter fails', status: 'failed', duration: 80, errorMessage: 'boom' },
];

async function report(request: APIRequestContext, baseUrl: string, body: object, token?: string) {
  return request.post(`${baseUrl}/api/playwright/report`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    data: body,
  });
}

test.describe('Playwright reporter API tokens', () => {
  let projectId: string;
  let userId: string;
  let baseUrl: string;
  const extraProjects: string[] = [];

  test.beforeEach(async ({ page, utils }) => {
    baseUrl = await utils.resolveBaseUrl();
    const user = await utils.createTestUser({ email: `reporter-${nanoid(8)}@example.com`.toLowerCase(), password: 'Rep0rter-Pass!' });
    userId = user.id;
    const project = await utils.createTestProject({ name: `reporter-${Date.now()}`, createdBy: user.id });
    projectId = project.id;
    await utils.signInAs(page, user.id);
    await page.addInitScript((id: string) => localStorage.setItem('selectedProjectId', id), projectId);
  });

  test.afterEach(async ({ utils }) => {
    for (const id of [projectId, ...extraProjects.splice(0)]) await utils.deleteProjectData(id);
    await utils.deleteUserById(userId);
  });

  test('should reject a report without a token', async ({ page, utils }) => {
    const res = await report(page.request, baseUrl, { runName: 'No token', results: RESULTS });

    expect(res.status()).toBe(401);
    expect(await utils.getTestRunsByProject(projectId)).toHaveLength(0);
  });

  test('should reject a report with an unknown token', async ({ page }) => {
    const res = await report(page.request, baseUrl, { runName: 'Bad token', results: RESULTS }, 'qlt_not-a-real-token');

    expect(res.status()).toBe(401);
  });

  test('should accept a report with a valid token and create the run in its project', async ({ page, utils }) => {
    const token = await utils.createApiTokenForProject(projectId);

    const res = await report(page.request, baseUrl, { runName: 'Valid token', results: RESULTS }, token);

    expect(res.status()).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, executionCount: 2 });
    expect(await utils.getTestRunsByProject(projectId)).toMatchObject([{ name: 'Valid token', executions: 2 }]);
  });

  test('should reject a token used for a different project', async ({ page, utils }) => {
    const other = await utils.createTestProject({ name: `reporter-other-${Date.now()}`, createdBy: userId });
    extraProjects.push(other.id);
    const token = await utils.createApiTokenForProject(projectId);

    const res = await report(page.request, baseUrl, { projectId: other.id, runName: 'Wrong project', results: RESULTS }, token);

    expect(res.status()).toBe(403);
    expect(await utils.getTestRunsByProject(other.id)).toHaveLength(0);
  });

  test('should create a token that is shown once and works for reporting', async ({ page }) => {
    const settings = new ReporterSettingsPage(page);
    await settings.goto();
    await expect(settings.emptyState).toBeVisible();

    const token = await settings.createToken('CI pipeline');

    expect(token).toMatch(/^qlt_[A-Za-z0-9_-]{43}$/);
    await expect(settings.tokenRow('CI pipeline')).toContainText(token.slice(0, 9));
    await expect(settings.tokenRow('CI pipeline')).not.toContainText(token);
    const res = await report(page.request, baseUrl, { runName: 'From UI token', results: RESULTS }, token);
    expect(res.status()).toBe(200);
  });

  test('should reject reports once the token is revoked', async ({ page }) => {
    const settings = new ReporterSettingsPage(page);
    await settings.goto();
    const token = await settings.createToken('Short-lived');

    await settings.revokeToken('Short-lived');

    await expect(settings.tokenRow('Short-lived')).toBeHidden();
    const res = await report(page.request, baseUrl, { runName: 'Revoked', results: RESULTS }, token);
    expect(res.status()).toBe(401);
  });
});
