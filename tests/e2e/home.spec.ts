import { test, expect } from './fixtures';
import { HomePage } from './pages/HomePage';

test('home page loads and health is ok', async ({ page, utils, testUser, }) => {
  // testUser is created via fixture and available here
  const home = new HomePage(page);
  const base = process.env.BASE_URL || 'http://localhost:3000';
  await home.goto(base);

  // check health endpoint
  const res = await page.request.get(base + '/health');
  expect(res.status()).toBe(200);
});
