import { test, expect } from './fixtures';
import { nanoid } from 'nanoid';
import { AdminPanelPage } from './pages/AdminPanelPage';
import { ProjectSelectionPage } from './pages/ProjectSelectionPage';

test.describe('Admin panel', () => {
  const createdUserIds: string[] = [];
  const createdLogins: string[] = [];
  let admin: { id: string; email: string };

  test.beforeEach(async ({ page, utils }) => {
    admin = await utils.createTestUser({ email: `admin-${nanoid(8)}@example.com`, role: 'admin', password: 'Adm1n-Pass!' });
    createdUserIds.push(admin.id);
    await utils.signInAs(page, admin.id);
  });

  test.afterEach(async ({ utils }) => {
    for (const id of createdUserIds.splice(0)) await utils.deleteUserById(id);
    for (const login of createdLogins.splice(0)) await utils.deleteUserByLogin(login);
  });

  async function createUser(utils: typeof import('./testUtils'), role: 'admin' | 'user' = 'user') {
    const user = await utils.createTestUser({ email: `member-${nanoid(8)}@example.com`, role, password: 'Memb3r-Pass!' });
    createdUserIds.push(user.id);
    return user;
  }

  test('should show the admin panel entry on the landing page for admins', async ({ page }) => {
    const projects = new ProjectSelectionPage(page);
    await projects.goto();

    await projects.adminPanelButton.click();

    await expect(new AdminPanelPage(page).heading).toBeVisible();
  });

  test('should hide the admin panel from a simple user', async ({ page, utils }) => {
    const member = await createUser(utils);
    await utils.signInAs(page, member.id);
    const projects = new ProjectSelectionPage(page);
    await projects.goto();
    await expect(projects.heading).toBeVisible();
    await expect(projects.adminPanelButton).toBeHidden();

    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();

    await expect(adminPanel.accessDenied).toBeVisible();
    await expect(adminPanel.usersTable).toBeHidden();
  });

  test('should add a user who must change the temporary password', async ({ page, utils }) => {
    const email = `new-${nanoid(8)}@example.com`.toLowerCase();
    createdLogins.push(email);
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();

    await adminPanel.addUser({ name: 'New Member', email, role: 'User', temporaryPassword: 'Temp-Pass-123' });

    await expect(adminPanel.userRow(email)).toContainText('Must change password');
    const stored = await utils.getUserByLogin(email);
    expect(stored).toMatchObject({ name: 'New Member', role: 'user', mustChangePassword: 1 });
  });

  test('should generate a temporary password and create a user with it', async ({ page, utils }) => {
    const email = `gen-${nanoid(8)}@example.com`.toLowerCase();
    createdLogins.push(email);
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();
    await adminPanel.openAddUserDialog();
    await adminPanel.fillNewUser({ name: 'Generated Member', email, role: 'User' });

    await adminPanel.newUserGeneratePassword.click();

    const generated = await adminPanel.newUserPassword.inputValue();
    expect(generated).toMatch(/^[A-Za-z0-9]{12}$/);
    await adminPanel.newUserSubmit.click();
    await expect(adminPanel.userRow(email)).toContainText('Must change password');
  });

  test('should copy the temporary password to the clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();
    await adminPanel.openAddUserDialog();
    await adminPanel.newUserGeneratePassword.click();
    const generated = await adminPanel.newUserPassword.inputValue();

    await adminPanel.newUserCopyPassword.click();

    await expect(page.getByText('Temporary password copied')).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(generated);
  });

  test('should promote a simple user to admin', async ({ page, utils }) => {
    const member = await createUser(utils);
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();

    await adminPanel.setRole(member.email, 'Admin');

    await expect.poll(async () => (await utils.getUserByLogin(member.email)).role).toBe('admin');
  });

  test('should reset a user password to a temporary one', async ({ page, utils }) => {
    const member = await createUser(utils);
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();
    await expect(adminPanel.userRow(member.email)).toContainText('Active');

    await adminPanel.resetPassword(member.email, 'Temp-Pass-456');

    await expect(adminPanel.userRow(member.email)).toContainText('Must change password');
  });

  test('should delete a user', async ({ page, utils }) => {
    const member = await createUser(utils);
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();

    await adminPanel.deleteUser(member.email);

    await expect(adminPanel.userRow(member.email)).toBeHidden();
    expect(await utils.getUserByLogin(member.email)).toBeNull();
  });

  test('should not let admins delete or demote themselves', async ({ page }) => {
    const adminPanel = new AdminPanelPage(page);
    await adminPanel.goto();

    const ownRow = adminPanel.userRow(admin.email);
    await expect(ownRow.getByTestId('admin-delete-user')).toBeDisabled();
    await expect(ownRow.getByTestId('admin-role-select')).toBeDisabled();
  });
});
