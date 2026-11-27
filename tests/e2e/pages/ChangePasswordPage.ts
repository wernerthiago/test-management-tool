import { Page, Locator } from '@playwright/test';

export class ChangePasswordPage {
  readonly page: Page;
  readonly title: Locator;
  readonly currentPasswordInput: Locator;
  readonly newPasswordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.title = page.getByTestId('change-password-title');
    this.currentPasswordInput = page.getByTestId('current-password');
    this.newPasswordInput = page.getByTestId('new-password');
    this.confirmPasswordInput = page.getByTestId('confirm-password');
    this.submitButton = page.getByTestId('change-password-submit');
  }

  async changePassword(currentPassword: string, newPassword: string) {
    await this.currentPasswordInput.fill(currentPassword);
    await this.newPasswordInput.fill(newPassword);
    await this.confirmPasswordInput.fill(newPassword);
    await this.submitButton.click();
  }
}
