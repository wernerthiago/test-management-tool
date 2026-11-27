import { Page, Locator } from '@playwright/test';
import { resolveBaseUrl } from '../testUtils';

export class AdminPanelPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly accessDenied: Locator;
  readonly usersTable: Locator;
  readonly addUserButton: Locator;
  readonly newUserName: Locator;
  readonly newUserEmail: Locator;
  readonly newUserRole: Locator;
  readonly newUserPassword: Locator;
  readonly newUserGeneratePassword: Locator;
  readonly newUserCopyPassword: Locator;
  readonly newUserSubmit: Locator;
  readonly resetPasswordInput: Locator;
  readonly resetPasswordSubmit: Locator;
  readonly deleteConfirmButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Admin panel' });
    this.accessDenied = page.getByTestId('admin-access-denied');
    this.usersTable = page.getByTestId('admin-users-table');
    this.addUserButton = page.getByTestId('admin-add-user');
    this.newUserName = page.getByTestId('new-user-name');
    this.newUserEmail = page.getByTestId('new-user-email');
    this.newUserRole = page.getByTestId('new-user-role');
    this.newUserPassword = page.getByTestId('new-user-password-input');
    this.newUserGeneratePassword = page.getByTestId('new-user-password-generate');
    this.newUserCopyPassword = page.getByTestId('new-user-password-copy');
    this.newUserSubmit = page.getByTestId('new-user-submit');
    this.resetPasswordInput = page.getByTestId('reset-password-input');
    this.resetPasswordSubmit = page.getByTestId('reset-password-submit');
    this.deleteConfirmButton = page.getByTestId('admin-delete-confirm');
  }

  async goto() {
    await this.page.goto(new URL('/admin', await resolveBaseUrl()).toString());
  }

  userRow(login: string): Locator {
    return this.page.getByTestId(`admin-user-row-${login}`);
  }

  async openAddUserDialog() {
    await this.addUserButton.click();
    await this.newUserName.waitFor({ state: 'visible' });
  }

  async fillNewUser({ name, email, role }: { name: string; email: string; role: 'Admin' | 'User' }) {
    await this.newUserName.fill(name);
    await this.newUserEmail.fill(email);
    await this.newUserRole.click();
    await this.page.getByRole('option', { name: role, exact: true }).click();
  }

  async addUser({ name, email, role, temporaryPassword }: { name: string; email: string; role: 'Admin' | 'User'; temporaryPassword: string }) {
    await this.openAddUserDialog();
    await this.fillNewUser({ name, email, role });
    await this.newUserPassword.fill(temporaryPassword);
    await this.newUserSubmit.click();
  }

  async setRole(login: string, role: 'Admin' | 'User') {
    await this.userRow(login).getByTestId('admin-role-select').click();
    await this.page.getByRole('option', { name: role, exact: true }).click();
  }

  async resetPassword(login: string, temporaryPassword: string) {
    await this.userRow(login).getByTestId('admin-reset-password').click();
    await this.resetPasswordInput.fill(temporaryPassword);
    await this.resetPasswordSubmit.click();
  }

  async deleteUser(login: string) {
    await this.userRow(login).getByTestId('admin-delete-user').click();
    await this.deleteConfirmButton.click();
  }
}
