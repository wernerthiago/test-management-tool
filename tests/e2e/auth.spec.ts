import { test, expect } from './fixtures';
import { nanoid } from 'nanoid';
import { LoginPage } from './pages/LoginPage';
import { ChangePasswordPage } from './pages/ChangePasswordPage';
import { ProjectSelectionPage } from './pages/ProjectSelectionPage';

const STRONG_PASSWORD = 'N3w-Passw0rd!';

test.describe('Authentication', () => {
  const createdUserIds: string[] = [];

  test.afterEach(async ({ utils }) => {
    for (const id of createdUserIds.splice(0)) await utils.deleteUserById(id);
  });

  async function createUser(utils: typeof import('./testUtils'), opts: { password: string; mustChangePassword: boolean }) {
    const user = await utils.createTestUser({ email: `auth-${nanoid(8)}@example.com`, ...opts });
    createdUserIds.push(user.id);
    return user;
  }

  test('should redirect an unauthenticated visitor to the login page', async ({ page }) => {
    await new ProjectSelectionPage(page).goto();

    await expect(page).toHaveURL(/\/login$/);
  });

  test('should reject a wrong password', async ({ page, utils }) => {
    const user = await createUser(utils, { password: 'Corr3ct-Pass!', mustChangePassword: false });
    const login = new LoginPage(page);

    await login.goto();
    await login.login(user.email, 'wrong-password');

    await expect(login.invalidCredentialsMessage).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test('should take a user with their own password straight to the projects page', async ({ page, utils }) => {
    const user = await createUser(utils, { password: 'Corr3ct-Pass!', mustChangePassword: false });
    const login = new LoginPage(page);

    await login.goto();
    await login.login(user.email, 'Corr3ct-Pass!');

    const projects = new ProjectSelectionPage(page);
    await expect(projects.heading).toBeVisible();
    await expect(projects.signedInUser).toHaveText(user.name);
  });

  test('should force the default admin to change the admin/admin password at first login', async ({ page, utils }) => {
    // The seeded account, in its first-start state
    await utils.setUserPassword('admin', 'admin', true);
    const login = new LoginPage(page);

    await login.goto();
    await login.login('admin', 'admin');

    const changePassword = new ChangePasswordPage(page);
    await expect(page).toHaveURL(/\/change-password$/);
    await expect(changePassword.title).toHaveText('Choose a new password');

    await changePassword.changePassword('admin', STRONG_PASSWORD);

    await expect(new ProjectSelectionPage(page).heading).toBeVisible();
    expect((await utils.getUserByLogin('admin')).mustChangePassword).toBe(0);
  });

  test('should keep a user with a temporary password on the change password page', async ({ page, utils }) => {
    const user = await createUser(utils, { password: 'Temp-Pass-123', mustChangePassword: true });
    const login = new LoginPage(page);
    await login.goto();
    await login.login(user.email, 'Temp-Pass-123');
    await expect(page).toHaveURL(/\/change-password$/);

    await new ProjectSelectionPage(page).goto();

    await expect(page).toHaveURL(/\/change-password$/);
  });

  test('should reject a new password that does not meet the strength rules', async ({ page, utils }) => {
    const user = await createUser(utils, { password: 'Temp-Pass-123', mustChangePassword: true });
    const login = new LoginPage(page);
    await login.goto();
    await login.login(user.email, 'Temp-Pass-123');
    const changePassword = new ChangePasswordPage(page);
    await expect(changePassword.title).toBeVisible();

    await changePassword.changePassword('Temp-Pass-123', 'weakpassword');

    await expect(page.getByText('Password must contain at least one uppercase letter', { exact: false })).toBeVisible();
    await expect(page).toHaveURL(/\/change-password$/);
  });

  test('should sign out and return to the login page', async ({ page, utils }) => {
    const user = await createUser(utils, { password: 'Corr3ct-Pass!', mustChangePassword: false });
    await utils.signInAs(page, user.id);
    const projects = new ProjectSelectionPage(page);
    await projects.goto();

    await projects.signOutButton.click();

    await expect(page).toHaveURL(/\/login$/);
  });
});
